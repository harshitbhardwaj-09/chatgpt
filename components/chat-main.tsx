"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { useChatStore } from "../lib/chat-store"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Square, Paperclip, X } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { SimpleFileUpload } from "./simple-file-upload"
import { MemoryIndicator } from "./memory-indicator"

export function ChatMain() {
  const { 
    activeChat, 
    chats,
    getCurrentChat, 
    addMessageToChat, 
    createNewChat, 
    renameChat, 
    generateChatTitle, 
    setActiveChat,
    saveEditedMessage,
    removeMessagesFromIndex,
    makeChatPermanent,
    streamingState,
    startStreaming,
    updateStreamingContent,
    finishStreaming,
    cancelStreaming,
    loadConversationsFromDB,
    windowState
  } = useChatStore()
  const currentChat = getCurrentChat()
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamController, setStreamController] = useState<AbortController | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<any[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [memoryUsed, setMemoryUsed] = useState(false)
  const [memoryCount, setMemoryCount] = useState(0)
  const [contextTruncated, setContextTruncated] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Conversations are loaded by ChatInterface; avoid reloading here to prevent wiping temporary chats

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  // Get messages from current chat
  const messages = currentChat?.messages || []

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Stop streaming function
  const stopStreaming = () => {
    if (streamController) {
      streamController.abort()
      setStreamController(null)
    }
    cancelStreaming()
    setIsLoading(false)
  }

  // Streaming helper function
  const streamResponse = async (messages: any[], chatId: string, assistantMessageId: string, userMessage?: { content: string; role: string }, attachments?: any[]) => {
    const controller = new AbortController()
    setStreamController(controller)
    startStreaming(chatId, assistantMessageId)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages,
          conversationId: chatId,
          // Only pass windowId if this conversation already has one
          windowId: chats.find(c => c.id === chatId)?.windowId || undefined,
          userMessage: userMessage,
          attachments: attachments
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMessage = `API Error (${response.status})`
        
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
            
            // Handle specific error types
            if (errorData.type === 'service_unavailable') {
              errorMessage += '\n\nThe AI service is experiencing high demand. Please wait a moment and try again.'
            } else if (errorData.type === 'configuration_error') {
              errorMessage = 'Configuration error: Please check your API keys in the environment variables.'
            }
          }
        } catch {
          // If JSON parsing fails, use text
          const errorText = await response.text()
          errorMessage = `API Error (${response.status}): ${errorText}`
        }
        
        throw new Error(errorMessage)
      }

      // Extract memory information and conversation ID from response headers
      const memoryUsedHeader = response.headers.get('X-Memory-Used')
      const memoryCountHeader = response.headers.get('X-Memory-Count')
      const contextTruncatedHeader = response.headers.get('X-Context-Truncated')
      const conversationIdHeader = response.headers.get('X-Conversation-Id')
      const newConversationHeader = response.headers.get('X-New-Conversation')
      
      setMemoryUsed(memoryUsedHeader === 'true')
      setMemoryCount(parseInt(memoryCountHeader || '0', 10))
      setContextTruncated(contextTruncatedHeader === 'true')

      // If this was a temporary chat that now has a permanent ID, update it
      if (newConversationHeader === 'true' && conversationIdHeader && chatId) {
        const currentChat = chats.find(c => c.id === chatId)
        if (currentChat && currentChat.isTemporary) {
          // Generate title from first user message
          const firstUserMessage = currentChat.messages.find(m => m.role === 'user')
          const generatedTitle = firstUserMessage ? 
            generateChatTitle(firstUserMessage.content) : 
            'New Conversation'
          
          makeChatPermanent(chatId, conversationIdHeader, generatedTitle)
        }
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream available')

      const decoder = new TextDecoder()
      let fullContent = ''
      let lastUpdateTime = Date.now()

      // Read the stream with timeout handling
      while (true) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stream timeout')), 30000) // 30s timeout
        )
        
        const readPromise = reader.read()
        
        try {
          const { done, value } = await Promise.race([readPromise, timeoutPromise]) as any
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk
          
          // Throttle updates to avoid excessive re-renders (max every 50ms)
          const now = Date.now()
          if (now - lastUpdateTime > 50 || chunk.includes('\n')) {
            updateStreamingContent(fullContent)
            lastUpdateTime = now
            
            // Auto-scroll to bottom during streaming
            setTimeout(scrollToBottom, 0)
          }
        } catch (timeoutError) {
          console.warn('Stream timeout, finishing with current content')
          break
        }
      }

      // Final update with complete content
      updateStreamingContent(fullContent)
      finishStreaming()
      
      return fullContent.trim()
    } catch (error) {
      console.error('Streaming error:', error)
      cancelStreaming()
      setStreamController(null)
      
      // Handle aborted requests gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        const currentContent = streamingState.streamingContent || ''
        updateStreamingContent(currentContent + '\n\n[Response stopped by user]')
        return currentContent
      }
      
      // Update message with error content
      const errorMessage = error instanceof Error 
        ? `Sorry, there was an error: ${error.message}` 
        : 'Sorry, there was an unexpected error processing your request.'
      
      updateStreamingContent(errorMessage)
      
      throw error
    }
  }

  // Handle message editing with regeneration
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChat || !currentChat) return

    // Find the message index
    const messageIndex = currentChat.messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    // Save the edited message
    saveEditedMessage(activeChat, messageId, newContent)

    // Remove all messages after the edited one (for regeneration)
    removeMessagesFromIndex(activeChat, messageIndex + 1)

    // If this was a user message, regenerate the assistant response
    const editedMessage = currentChat.messages[messageIndex]
    if (editedMessage.role === 'user') {
      // Get all messages up to and including the edited one
      const updatedChat = getCurrentChat()
      if (!updatedChat) return

      const messagesToSend = updatedChat.messages.slice(0, messageIndex + 1).map(msg => ({
        role: msg.role,
        content: msg.id === messageId ? newContent : msg.content
      }))

      // Generate new response
      setIsLoading(true)
      try {
        // Add placeholder assistant message for streaming
        addMessageToChat(activeChat, {
          content: "",
          role: "assistant",
        })

        // Get the new assistant message ID
        const updatedChatData = getCurrentChat()
        if (!updatedChatData || updatedChatData.messages.length === 0) return
        
        const assistantMessage = updatedChatData.messages[updatedChatData.messages.length - 1]
        
        // Stream the response (no new user message for regeneration)
        await streamResponse(messagesToSend, activeChat, assistantMessage.id)
      } catch (error) {
        console.error('Error regenerating response:', error)
        addMessageToChat(activeChat, {
          content: "Sorry, there was an error regenerating the response. Please try again.",
          role: "assistant",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((!input?.trim() && attachedFiles.length === 0) || isLoading) return

    let chatId = activeChat
    let isNewChat = false
    if (!chatId) {
      chatId = createNewChat()
      isNewChat = true
    }

    // Prepare user message content with file context
    let messageContent = input?.trim() || ""
    
    // Add file content as context if there are attachments
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(file => {
        return `[File: ${file.fileName}]\n${file.content}\n[End of ${file.fileName}]`
      }).join('\n\n')
      
      messageContent = attachedFiles.length > 0 
        ? `${messageContent}\n\nFiles attached:\n${fileContext}`
        : messageContent
    }

    // Add user message to store with attachments
    if (chatId) {
      const fileAttachments = attachedFiles.map(file => ({
        id: file.id,
        type: file.type,
        fileName: file.fileName,
        fileType: file.fileType,
        content: file.content,
        mimeType: file.mimeType,
        size: file.size
      }))

      addMessageToChat(chatId, {
        content: input?.trim() || "", // Store original input, not file-enriched content
        role: "user",
        attachments: fileAttachments.length > 0 ? fileAttachments : undefined
      })

      // Update chat title if this is the first message
      const chat = getCurrentChat()
      if (chat && chat.messages.length === 1) {
        const title = generateChatTitle(input?.trim() || attachedFiles[0]?.originalName || "New Chat")
        renameChat(chatId, title)
      }

      // Do not navigate for a brand-new temporary chat; we'll move to /c/[id]
      // automatically once the server assigns a permanent ID.
    }

    // Clear input and attachments immediately
    const userInput = messageContent
    setInput("")
    setAttachedFiles([])
    
    // Send message to API with streaming
    setIsLoading(true)
    try {
      // Add placeholder assistant message for streaming
      if (chatId) {
        addMessageToChat(chatId, {
          content: "",
          role: "assistant",
        })

        // Get the new assistant message ID
        const updatedChatData = getCurrentChat()
        if (updatedChatData && updatedChatData.messages.length > 0) {
          const assistantMessage = updatedChatData.messages[updatedChatData.messages.length - 1]
          
          // Prepare messages for API
          const messagesToSend = [...(currentChat?.messages || []), {
            role: 'user' as const,
            content: userInput
          }]

          // Convert attachedFiles to the format expected by the API
          const attachmentsForAPI = attachedFiles.map(file => ({
            id: file.id,
            type: file.type,
            fileName: file.fileName,
            fileType: file.fileType,
            content: file.content,
            mimeType: file.mimeType,
            size: file.size
          }))

          // Stream the response
          await streamResponse(messagesToSend, chatId, assistantMessage.id, {
            content: userInput,
            role: 'user'
          }, attachmentsForAPI)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Show error message to user
      if (chatId) {
        addMessageToChat(chatId, {
          content: "Sorry, there was an error processing your request. Please try again.",
          role: "assistant",
        })
      }
    } finally {
      setIsLoading(false)
    }

    // Focus textarea after completion
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.closest("form")
      if (form) {
        onSubmit({ preventDefault: () => {}, target: form } as any)
      }
    }
  }

  // File upload handlers  
  const handleFileRemoved = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload)
  }

  return (
    <main className="transition-width relative h-screen w-full flex-1 overflow-auto">
      <div className="group/thread h-full w-full">
        <div role="presentation" className="composer-parent flex flex-col focus-visible:outline-0 overflow-hidden h-full">
          {/* Chat Messages Area */}
          <div className="relative basis-auto flex-col -mb-7 grow flex overflow-hidden">
            <div className="relative h-full">
              <div className="flex h-full flex-col overflow-y-auto pt-14">
                <div className="flex flex-col text-sm pb-25">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                        ChatGPT
                      </div>
                      <p className="text-muted-foreground text-lg">
                        How can I help you today?
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Memory Indicator */}
                      {messages.length > 0 && (memoryUsed || contextTruncated) && (
                        <div className="w-full px-4 sm:px-6 lg:px-16 mb-4">
                          <div className="mx-auto max-w-2xl lg:max-w-3xl">
                            <MemoryIndicator 
                              memoryUsed={memoryUsed}
                              memoryCount={memoryCount}
                              contextTruncated={contextTruncated}
                            />
                          </div>
                        </div>
                      )}
                      
                      {messages.map((message: any, index: number) => (
                        <article 
                          key={message.id}
                          className="w-full focus:outline-none"
                          style={{color: 'var(--token-text-primary)'}}
                          tabIndex={-1}
                          dir="auto"
                        >
                          <div className="text-base my-auto mx-auto pt-3 px-4 sm:px-6 lg:px-16">
                            <div className="mx-auto max-w-2xl lg:max-w-3xl flex-1 group/turn-messages focus-visible:outline-hidden relative flex w-full min-w-0 flex-col" tabIndex={-1}>
                              <ChatMessage 
                                message={{
                                  id: message.id,
                                  content: message.content,
                                  role: message.role,
                                  timestamp: new Date(),
                                }}
                                onEdit={handleEditMessage}
                                isLoading={isLoading && index === messages.length - 1}
                                isStreaming={isLoading && index === messages.length - 1 && message.role === "assistant"}
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                        <article className="w-full focus:outline-none" tabIndex={-1} dir="auto" style={{color: 'var(--token-text-primary)'}}>
                          <div className="text-base my-auto mx-auto pt-3 px-4 sm:px-6 lg:px-16">
                            <div className="mx-auto max-w-2xl lg:max-w-3xl flex-1 group/turn-messages focus-visible:outline-hidden relative flex w-full min-w-0 flex-col" tabIndex={-1}>
                              <ChatMessage 
                                message={{
                                  id: "loading",
                                  content: "",
                                  role: "assistant",
                                  timestamp: new Date(),
                                }}
                                isLoading={true} 
                              />
                            </div>
                          </div>
                        </article>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Composer Area */}
          <div className="group/thread-bottom-container relative isolate z-10 w-full basis-auto" style={{backgroundColor: 'var(--token-main-surface-primary)'}}>
            <div className="text-base mx-auto px-4 sm:px-6 lg:px-16">
              <div className="mx-auto max-w-2xl lg:max-w-3xl flex-1">
                <div className="relative z-1 flex h-full max-w-full flex-1 flex-col">
                  {/* File Upload Interface */}
                  {showFileUpload && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-token-main-surface-primary border border-token-border-medium rounded-lg shadow-lg z-10">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-token-text-primary">Add files</span>
                          <button
                            type="button"
                            onClick={() => setShowFileUpload(false)}
                            className="p-1 hover:bg-token-main-surface-secondary rounded transition-colors"
                          >
                            <X className="h-4 w-4 text-token-text-secondary" />
                          </button>
                        </div>
                        <SimpleFileUpload 
                          onFilesUploaded={setAttachedFiles}
                          onFileRemoved={handleFileRemoved}
                          attachments={attachedFiles}
                        />
                      </div>
                    </div>
                  )}

                  {/* Attached Files Display */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 bg-token-main-surface-secondary rounded-full text-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-token-text-secondary">
                            <path d="M14.828 16.243L9.172 21.899C8.391 22.68 7.609 22.68 6.828 21.899C6.047 21.118 6.047 20.336 6.828 19.555L12.484 13.899L6.828 8.243C6.047 7.462 6.047 6.68 6.828 5.899C7.609 5.118 8.391 5.118 9.172 5.899L14.828 11.555L20.484 5.899C21.265 5.118 22.047 5.118 22.828 5.899C23.609 6.68 23.609 7.462 22.828 8.243L17.172 13.899L22.828 19.555C23.609 20.336 23.609 21.118 22.828 21.899C22.047 22.68 21.265 22.68 20.484 21.899L14.828 16.243Z"/>
                          </svg>
                          <span className="text-token-text-primary font-medium truncate max-w-32">{file.originalName}</span>
                          <button
                            type="button"
                            onClick={() => handleFileRemoved(file.id)}
                            className="ml-1 p-0.5 hover:bg-token-main-surface-tertiary rounded-full transition-colors"
                          >
                            <X className="h-3 w-3 text-token-text-secondary" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form className="group/composer w-full" onSubmit={onSubmit}>
                    <div className="flex items-center gap-3 overflow-clip bg-clip-padding p-3 shadow-short" style={{borderRadius: '28px', backgroundColor: 'var(--token-bg-primary)', border: '1px solid var(--token-border-light)'}}>
                      {/* Leading section (File attachment button) */}
                      <div className="flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="composer-btn h-8 w-8"
                          onClick={toggleFileUpload}
                          aria-label="Attach files"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Primary section (Textarea) */}
                      <div className="flex-1 min-h-[40px] flex items-center">
                        <Textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => {
                            console.log('Input changing:', e.target.value) // Debug log
                            setInput(e.target.value)
                            adjustTextareaHeight()
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder={isLoading ? "AI is thinking..." : "Message ChatGPT"}
                          className="w-full min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent px-0 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                          disabled={isLoading}
                          rows={1}
                          autoFocus
                          style={{ 
                            color: 'var(--token-text-primary)',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>

                      {/* Trailing section (Voice + Send) */}
                      <div className="flex items-center gap-2 grid-area-trailing">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="composer-btn"
                            aria-label="Dictate button"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="icon">
                              <path d="M15.7806 10.1963C16.1326 10.3011 16.3336 10.6714 16.2288 11.0234L16.1487 11.2725C15.3429 13.6262 13.2236 15.3697 10.6644 15.6299L10.6653 16.835H12.0833L12.2171 16.8486C12.5202 16.9106 12.7484 17.1786 12.7484 17.5C12.7484 17.8214 12.5202 18.0894 12.2171 18.1514L12.0833 18.165H7.91632C7.5492 18.1649 7.25128 17.8672 7.25128 17.5C7.25128 17.1328 7.5492 16.8351 7.91632 16.835H9.33527L9.33429 15.6299C6.775 15.3697 4.6558 13.6262 3.84992 11.2725L3.76984 11.0234L3.74445 10.8906C3.71751 10.5825 3.91011 10.2879 4.21808 10.1963C4.52615 10.1047 4.84769 10.2466 4.99347 10.5195L5.04523 10.6436L5.10871 10.8418C5.8047 12.8745 7.73211 14.335 9.99933 14.335C12.3396 14.3349 14.3179 12.7789 14.9534 10.6436L15.0052 10.5195C15.151 10.2466 15.4725 10.1046 15.7806 10.1963ZM12.2513 5.41699C12.2513 4.17354 11.2437 3.16521 10.0003 3.16504C8.75675 3.16504 7.74835 4.17343 7.74835 5.41699V9.16699C7.74853 10.4104 8.75685 11.418 10.0003 11.418C11.2436 11.4178 12.2511 10.4103 12.2513 9.16699V5.41699ZM13.5814 9.16699C13.5812 11.1448 11.9781 12.7479 10.0003 12.748C8.02232 12.748 6.41845 11.1449 6.41828 9.16699V5.41699C6.41828 3.43889 8.02221 1.83496 10.0003 1.83496C11.9783 1.83514 13.5814 3.439 13.5814 5.41699V9.16699Z"/>
                            </svg>
                          </Button>
                          
                          {isLoading || streamingState.isStreaming ? (
                            <Button 
                              type="button" 
                              size="icon" 
                              onClick={stopStreaming}
                              variant="ghost"
                              className="composer-submit-btn h-9 w-9 text-black dark:text-white"
                              title="Stop generating"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              type="submit" 
                              size="icon" 
                              className="composer-submit-btn composer-submit-button-color h-9 w-9" 
                              disabled={!input?.trim()}
                              title="Send message"
                            >
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="icon">
                                <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z"/>
                              </svg>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            {/* Footer disclaimer */}
            <div className="relative mt-auto flex min-h-8 w-full items-center justify-center p-2 text-center text-xs md:px-15" style={{color: 'var(--token-text-secondary)', backgroundColor: 'transparent'}}>
              <div>
                ChatGPT can make mistakes. Check important info.{" "}
                <a className="cursor-pointer underline" style={{color: 'var(--token-text-primary)', textDecorationColor: 'var(--token-text-primary)'}}>
                  Cookie Preferences
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
