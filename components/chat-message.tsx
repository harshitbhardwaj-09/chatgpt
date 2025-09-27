"use client"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Copy, ThumbsUp, ThumbsDown, Edit2, Check, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useChatStore } from "@/lib/chat-store"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  isStreaming?: boolean
  onEdit?: (messageId: string, newContent: string) => void
}

export function ChatMessage({ message, isLoading = false, isStreaming = false, onEdit }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [displayedContent, setDisplayedContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { 
    editState, 
    streamingState,
    startEditingMessage, 
    updateEditedContent, 
    cancelEditing 
  } = useChatStore()

  const isEditing = editState.isEditing && editState.messageId === message.id
  const isUser = message.role === "user"
  const isCurrentlyStreaming = streamingState.isStreaming && streamingState.streamingMessageId === message.id

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEditStart = () => {
    startEditingMessage(message.id, message.content)
  }

  const handleEditCancel = () => {
    cancelEditing()
  }

  const handleEditSave = () => {
    if (onEdit && editState.editedContent.trim()) {
      onEdit(message.id, editState.editedContent.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleEditCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleEditSave()
    }
  }

  // Auto-resize textarea and focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.focus()
      // Auto-resize
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [isEditing])

  // Auto-resize textarea on content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateEditedContent(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  // Real-time content update for streaming messages
  useEffect(() => {
    if (isCurrentlyStreaming) {
      // For streaming messages, show content immediately as it comes in
      setDisplayedContent(message.content)
    } else if (isStreaming && message.content) {
      // For non-real-time streaming (fallback), use typing animation
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex <= message.content.length) {
          setDisplayedContent(message.content.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
        }
      }, 15) // Slightly faster for better UX
      
      return () => clearInterval(interval)
    } else {
      setDisplayedContent(message.content)
    }
  }, [message.content, isStreaming, isCurrentlyStreaming])

  return (
    <div className={`group/turn-messages flex w-full min-w-0 flex-col`}>
      <div className="group/turn group/turn-edit">
        <div className="group/conversation-turn relative flex w-full min-w-0 flex-col agent-turn" tabIndex={-1}>
          <div className="flex-col gap-1 md:gap-3">
            <div className="flex max-w-full flex-col flex-grow">
              
              {/* Avatar and message wrapper */}
              <div data-message-author-role={message.role} data-message-id={message.id} dir="auto" className="group/message agent-message-wrapper">
                <div className="group/message w-full text-token-text-primary" dir="auto" data-testid="conversation-turn-3" data-scroll-anchor="false">
                  <div className="px-4 py-2 justify-center text-base md:gap-6 m-auto">
                    <div className="flex flex-1 gap-4 text-base mx-auto md:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
                      
                      {/* Avatar */}
                      <div className="flex-shrink-0 flex flex-col relative items-end">
                        <div className="pt-0.5">
                          <div className="gizmo-shadow-stroke flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
                            {isUser ? (
                              <div className="relative p-1 rounded-sm flex items-center justify-center bg-token-main-surface-primary text-token-text-primary h-8 w-8">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="icon-md">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                              </div>
                            ) : (
                              <div className="relative p-1 rounded-sm flex items-center justify-center bg-token-main-surface-primary text-white h-8 w-8">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="icon-md text-token-text-primary">
                                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 1-3.09-1.413L2.25 15.75l2.846-.813a4.5 4.5 0 0 1 1.413-3.09L15.75 2.25l2.25 2.25-9.597 9.597a4.5 4.5 0 0 1-3.09 1.407Z"/>
                                  <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v.348a4.5 4.5 0 0 1 2.53 2.53l.348.348a5.23 5.23 0 0 1 3.434 1.279"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message content */}
                      <div className="relative flex w-full min-w-0 flex-col agent-turn">
                        <div className="flex-col gap-1 md:gap-3">
                          <div className="flex max-w-full flex-col flex-grow">
                            <div data-message-author-role={message.role} data-message-id={message.id} dir="auto">
                              <div className="group/message agent-message-wrapper">
                                <div className="group/message w-full text-token-text-primary" dir="auto">
                                  
                                  {/* Message text */}
                                  <div className="flex w-full flex-col gap-1 empty:hidden first:pt-[3px]">
                                    <div className="markdown prose w-full break-words dark:prose-invert light" dir="auto">
                                      {isEditing ? (
                                        <div className="w-full animate-in fade-in-0 duration-200">
                                          <Textarea
                                            ref={textareaRef}
                                            value={editState.editedContent}
                                            onChange={handleContentChange}
                                            onKeyDown={handleKeyDown}
                                            className="w-full min-h-[60px] resize-none border-2 border-blue-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-200"
                                            style={{ 
                                              color: 'var(--token-text-primary)',
                                              backgroundColor: 'var(--token-bg-primary)'
                                            }}
                                            placeholder="Edit your message..."
                                          />
                                          <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                                            <Button
                                              size="sm"
                                              onClick={handleEditSave}
                                              disabled={!editState.editedContent.trim()}
                                              className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 disabled:opacity-50"
                                            >
                                              <Check className="w-3 h-3 mr-1" />
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={handleEditCancel}
                                              className="h-7 px-3 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                              <X className="w-3 h-3 mr-1" />
                                              Cancel
                                            </Button>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1 animate-in fade-in-0 duration-300 delay-100">
                                            Press <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl+Enter</kbd> to save, <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Escape</kbd> to cancel
                                          </div>
                                        </div>
                                      ) : isLoading && !displayedContent ? (
                                        <div className="flex items-center gap-1 py-2">
                                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                        </div>
                                      ) : (
                                        <div className="relative">
                                          <p style={{color: 'var(--token-text-primary)'}}>
                                            {displayedContent}
                                            {(isCurrentlyStreaming || (isStreaming && displayedContent.length < message.content.length)) && (
                                              <span className="inline-block w-0.5 h-5 bg-current animate-pulse ml-0.5 align-middle">|</span>
                                            )}
                                          </p>
                                          {isCurrentlyStreaming && (
                                            <div className="absolute -bottom-1 left-0 text-xs text-gray-400 animate-pulse">
                                              AI is typing...
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Message actions */}
                                  {!isLoading && message.content && !isEditing && !isCurrentlyStreaming && (
                                    <div className="mt-1 flex justify-start gap-3 empty:hidden">
                                      <div className="text-gray-400 flex self-end lg:self-center justify-center mt-0 gap-1 lg:gap-2 lg:absolute lg:top-0 lg:translate-x-full lg:right-0 lg:mt-0 lg:pl-2 visible">
                                        {/* Copy button for all messages */}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="flex h-7 w-7 items-center justify-center rounded-full text-token-text-secondary transition hover:bg-token-main-surface-secondary"
                                          onClick={copyToClipboard}
                                          aria-label="Copy"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="icon-sm">
                                            <path d="M11.986 3H12.5c.276 0 .5-.224.5-.5s-.224-.5-.5-.5h-1c0-.552-.448-1-1-1H4.5c-.552 0-1 .448-1 1v8c0 .552.448 1 1 1H6v1.5c0 .276.224.5.5.5s.5-.224.5-.5V12h4.5c.552 0 1-.448 1-1V4c0-.552-.448-1-1-1zM5.5 10V3H10v7H5.5zm5.5-6v6H7V4h4z"/>
                                          </svg>
                                        </Button>
                                        
                                        {/* Edit button for user messages */}
                                        {isUser && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="flex h-7 w-7 items-center justify-center rounded-full text-token-text-secondary transition-all duration-200 hover:bg-token-main-surface-secondary hover:text-blue-600 opacity-70 hover:opacity-100"
                                            onClick={handleEditStart}
                                            aria-label="Edit message"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                        
                                        {/* Assistant message actions */}
                                        {!isUser && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="flex h-7 w-7 items-center justify-center rounded-full text-token-text-secondary transition hover:bg-token-main-surface-secondary"
                                              aria-label="Good response"
                                            >
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="icon-sm">
                                                <path d="M11.3 1.046A1 1 0 0 1 12.85 1.95l-.85-.904zm1.55.904-2.41 11.996-8.45-4.63a1 1 0 0 1 .894-1.788L10.25 10.75l2.6-9.8z"/>
                                              </svg>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="flex h-7 w-7 items-center justify-center rounded-full text-token-text-secondary transition hover:bg-token-main-surface-secondary"
                                              aria-label="Bad response"
                                            >
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="icon-sm">
                                                <path d="M11.3 14.954A1 1 0 0 0 12.85 14.05l-.85.904zm1.55-.904-2.41-11.996L2 6.684a1 1 0 0 0 .894 1.788L10.25 5.25l2.6 9.8z"/>
                                              </svg>
                                            </Button>
                                          </>
                                        )}
                                        
                                        {copied && (
                                          <span className="text-xs text-token-text-secondary ml-2">Copied!</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
