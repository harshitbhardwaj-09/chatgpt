"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { useChatStore } from "../lib/chat-store"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Send, Square } from "lucide-react"
import { ChatMessage } from "./chat-message"

export function ChatMain() {
  const { activeChat, getCurrentChat, addMessageToChat, createNewChat, renameChat, generateChatTitle, setActiveChat } = useChatStore()
  const currentChat = getCurrentChat()
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input?.trim() || isLoading) return

    let chatId = activeChat
    if (!chatId) {
      chatId = createNewChat()
    }

    // Add user message to store
    if (chatId) {
      addMessageToChat(chatId, {
        content: input?.trim() || "",
        role: "user",
      })

      // Update chat title if this is the first message
      const chat = getCurrentChat()
      if (chat && chat.messages.length === 1) {
        const title = generateChatTitle(input?.trim() || "")
        renameChat(chatId, title)
      }
    }

    // Clear input immediately
    const userInput = input.trim()
    setInput("")
    
    // Send message to API with streaming
    setIsLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(currentChat?.messages || []), {
            role: 'user',
            content: userInput
          }]
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Add placeholder assistant message for streaming
      if (chatId) {
        addMessageToChat(chatId, {
          content: "",
          role: "assistant",
        })
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      const decoder = new TextDecoder()

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
      }

      // Update the final assistant message
      if (assistantMessage && chatId) {
        const currentChatData = getCurrentChat()
        if (currentChatData && currentChatData.messages.length > 0) {
          const lastMessage = currentChatData.messages[currentChatData.messages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantMessage.trim()
          }
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
                  <form className="group/composer w-full" onSubmit={onSubmit}>
                    <div className="flex items-center gap-3 overflow-clip bg-clip-padding p-3 shadow-short" style={{borderRadius: '28px', backgroundColor: 'var(--token-bg-primary)', border: '1px solid var(--token-border-light)'}}>
                      {/* Leading section (Plus button) */}
                      <div className="flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="composer-btn h-8 w-8"
                          aria-label="Add files and more"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="icon">
                            <path d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5L16.6338 9.34863C16.9369 9.41057 17.165 9.67857 17.165 10C17.165 10.3214 16.9369 10.5894 16.6338 10.6514L16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z"/>
                          </svg>
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
                          
                          {isLoading ? (
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="ghost" 
                              className="composer-submit-btn h-9 w-9"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              type="submit" 
                              size="icon" 
                              className="composer-submit-btn composer-submit-button-color h-9 w-9" 
                              disabled={!input?.trim()}
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
