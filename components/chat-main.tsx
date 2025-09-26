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
  const { activeChat, getCurrentChat, addMessageToChat, createNewChat, renameChat, generateChatTitle } = useChatStore()
  const currentChat = getCurrentChat()
  const [isLoading, setIsLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
  }, [currentChat?.messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const input = formData.get("message") as string

    if (!input.trim() || isLoading) return

    let chatId = activeChat
    if (!chatId) {
      chatId = createNewChat()
    }

    if (chatId) {
      addMessageToChat(chatId, {
        content: input.trim(),
        role: "user",
      })

      // Update chat title if this is the first message
      const chat = getCurrentChat()
      if (chat && chat.messages.length === 1) {
        const title = generateChatTitle(input.trim())
        renameChat(chatId, title)
      }
    }

    // Send message to API
    setIsLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentChat?.messages || []
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const data = JSON.parse(line.slice(2))
              if (data.content) {
                assistantMessage += data.content
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      // Add assistant response to chat
      if (assistantMessage && chatId) {
        addMessageToChat(chatId, {
          content: assistantMessage,
          role: "assistant",
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }

    form.reset()

    // Focus back to textarea after sending
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.closest("form")
      if (form) {
        handleSubmit({ preventDefault: () => {}, target: form } as any)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {!currentChat || currentChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground">Start a conversation by typing a message below.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {currentChat.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  id: message.id,
                  content: message.content,
                  role: message.role,
                  timestamp: message.timestamp,
                }}
              />
            ))}
            {isLoading && (
              <ChatMessage
                message={{
                  id: "loading",
                  content: "",
                  role: "assistant",
                  timestamp: new Date(),
                }}
                isLoading={true}
              />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              ref={textareaRef}
              name="message"
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT..."
              className="min-h-[60px] max-h-[200px] pr-12 resize-none bg-input border-border focus:ring-ring"
              disabled={isLoading}
            />
            <div className="absolute right-2 bottom-2">
              {isLoading ? (
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" className="h-8 w-8">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            ChatGPT can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  )
}
