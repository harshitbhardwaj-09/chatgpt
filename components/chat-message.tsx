"use client"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { useState } from "react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = message.role === "user"

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/ai-assistant-avatar.png" />
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          )}
        </div>

        {!isUser && !isLoading && message.content && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={copyToClipboard}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <ThumbsDown className="h-3 w-3" />
            </Button>
            {copied && <span className="text-xs text-muted-foreground ml-2">Copied!</span>}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/diverse-user-avatars.png" />
          <AvatarFallback className="bg-secondary text-secondary-foreground">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
