"use client"

import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Copy, ThumbsUp, ThumbsDown, Check, X, Edit2, FileText, Image, Upload, RefreshCcw, MoreHorizontal } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useChatStore } from "@/lib/chat-store"

interface FileAttachment {
  id: string
  type: 'document' | 'image'
  fileName: string
  fileType: string
  content?: string
  mimeType?: string
  size: number
  cloudinaryUrl?: string
  publicId?: string
}

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  attachments?: FileAttachment[]
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  isStreaming?: boolean
  onEdit?: (messageId: string, newContent: string) => void
}

export function ChatMessage({ message, isLoading = false, isStreaming = false, onEdit }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null)
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
    setTimeout(() => setCopied(false), 1500)
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
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [isEditing])

  // Auto-resize textarea on content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateEditedContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  // Real-time content update for streaming messages
  useEffect(() => {
    if (isCurrentlyStreaming) {
      setDisplayedContent(message.content)
    } else if (isStreaming && message.content) {
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex <= message.content.length) {
          setDisplayedContent(message.content.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(interval)
        }
      }, 15)
      return () => clearInterval(interval)
    } else {
      setDisplayedContent(message.content)
    }
  }, [message.content, isStreaming, isCurrentlyStreaming])

  // Basic Markdown-ish parser for fenced code blocks
  type Block = { type: 'text' | 'code'; content: string; language?: string }
  const parseContentToBlocks = (content: string): Block[] => {
    const blocks: Block[] = []
    const codeFence = /```(\w+)?\n([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = codeFence.exec(content)) !== null) {
      const [full, lang, code] = match
      const start = match.index
      if (start > lastIndex) {
        blocks.push({ type: 'text', content: content.slice(lastIndex, start) })
      }
      blocks.push({ type: 'code', content: code.trimEnd(), language: lang || 'text' })
      lastIndex = start + full.length
    }
    if (lastIndex < content.length) {
      blocks.push({ type: 'text', content: content.slice(lastIndex) })
    }
    return blocks
  }

  const handleCopyCode = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedBlock(idx)
      setTimeout(() => setCopiedBlock(null), 1500)
    } catch {}
  }

  // Transform lists: "**Item**" lines => numbered; lines starting with -/* => bullets
  const transformListFormatting = (text: string): string => {
    const lines = text.split(/\r?\n/)
    const result: string[] = []
    let i = 0
    const boldOnlyRegex = /^\s*\*\*(.+?)\*\*\s*$/
    const bulletRegex = /^\s*[-*]\s+(.+)$/
    while (i < lines.length) {
      if (boldOnlyRegex.test(lines[i])) {
        const group: string[] = []
        while (i < lines.length && boldOnlyRegex.test(lines[i])) {
          const m = lines[i].match(boldOnlyRegex)
          if (m) group.push(m[1].trim())
          i++
        }
        group.forEach((item, idx) => result.push(`${idx + 1}. ${item}`))
        continue
      }
      if (bulletRegex.test(lines[i])) {
        const group: string[] = []
        while (i < lines.length && bulletRegex.test(lines[i])) {
          const m = lines[i].match(bulletRegex)
          if (m) group.push(m[1].trim())
          i++
        }
        group.forEach((item) => result.push(`• ${item}`))
        continue
      }
      result.push(lines[i])
      i++
    }
    return result.join('\n')
  }

  // USER MESSAGE: right-aligned dark bubble without avatar
  if (isUser) {
    return (
      <div className="group/turn-messages flex w-full min-w-0 flex-col">
        <div className="px-4 py-2 m-auto w-full">
          <div className="flex w-full justify-end">
            <div className="group/bubble relative max-w-[80%] md:max-w-[70%] lg:max-w-[60%] ml-auto">
              {isEditing ? (
                <div className="w-full animate-in fade-in-0 duration-200">
                  <Textarea
                    ref={textareaRef}
                    value={editState.editedContent}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    className="w-full min-h-[60px] resize-none border border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-1 focus:ring-blue-600"
                    placeholder="Edit your message..."
                    aria-label="Edit your message"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleEditSave} disabled={!editState.editedContent.trim()} className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" aria-label="Save edit">
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-7 px-3" aria-label="Cancel edit">
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                <div className="relative bg-neutral-900 text-neutral-100 rounded-2xl px-4 py-2 shadow">
                  {/* Content */}
                  <div className="space-y-3">
                    {parseContentToBlocks(displayedContent).map((blk, idx) => (
                      blk.type === 'code' ? (
                        <div key={idx} className="rounded-lg border border-neutral-800 bg-black text-neutral-100 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
                            <span className="text-xs font-medium uppercase tracking-wide text-neutral-300">{blk.language}</span>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-neutral-300 hover:bg-neutral-800" onClick={() => handleCopyCode(blk.content, idx)} aria-label={`Copy ${blk.language} code`}>
                              <Copy className="w-3.5 h-3.5 mr-1" /> {copiedBlock === idx ? 'Copied' : 'Copy code'}
                            </Button>
                          </div>
                          <pre className="text-sm leading-6 whitespace-pre overflow-auto p-3">
                            <code>{blk.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <p key={idx} className="whitespace-pre-wrap">{transformListFormatting(blk.content)}</p>
                      )
                    ))}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-3 p-2 rounded-md border border-neutral-700 bg-neutral-800/60">
                            <div className="flex-shrink-0">
                              {attachment.type === 'image' ? (
                                <div className="w-7 h-7 bg-blue-900/40 rounded-md flex items-center justify-center">
                                  <Image className="w-4 h-4 text-blue-300" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 bg-green-900/40 rounded-md flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-green-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-neutral-100 truncate" aria-label={`Attachment ${attachment.fileName}`}>{attachment.fileName}</p>
                              <p className="text-[10px] text-neutral-300/80">{attachment.fileType} • {Math.round(attachment.size / 1024)} KB</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Hover actions below bubble */}
                <div className="flex justify-end mt-1 opacity-0 transition-opacity duration-150 group-hover/bubble:opacity-100">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 hover:text-white hover:bg-neutral-800" onClick={copyToClipboard} aria-label="Copy message">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 hover:text-white hover:bg-neutral-800" onClick={handleEditStart} aria-label="Edit message">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ASSISTANT MESSAGE: left-aligned with avatar/icon and toolbar
  return (
    <div className={`group/turn-messages flex w-full min-w-0 flex-col`}>
      <div className="group/turn group/turn-edit">
        <div className="group/conversation-turn relative flex w-full min-w-0 flex-col agent-turn" tabIndex={-1}>
          <div className="flex-col gap-1 md:gap-3">
            <div className="flex max-w-full flex-col flex-grow">
              
              {/* Avatar and message wrapper */}
              <div data-message-author-role={message.role} data-message-id={message.id} dir="auto" className="group/message agent-message-wrapper" aria-live={isCurrentlyStreaming ? 'polite' : undefined}>
                <div className="group/message w-full text-token-text-primary" dir="auto" data-testid="conversation-turn-3" data-scroll-anchor="false">
                  <div className="px-4 py-2 justify-center text-base md:gap-6 m-auto">
                    <div className="flex flex-1 gap-4 text-base mx-auto md:gap-6 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
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
                                      {isLoading && !displayedContent ? (
                                        <div className="flex items-center py-2 gap-1">
                                          <span className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-200 animate-bounce [animation-delay:-0.3s]"></span>
                                          <span className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-200 animate-bounce [animation-delay:-0.15s]"></span>
                                          <span className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-200 animate-bounce"></span>
                                        </div>
                                      ) : (
                                        <div className="relative">
                                          <div className="space-y-3">
                                            {parseContentToBlocks(displayedContent).map((blk, idx) => (
                                              blk.type === 'code' ? (
                                                <div key={idx} className="rounded-lg border border-neutral-800 bg-black text-neutral-100 overflow-hidden">
                                                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
                                                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-300">{blk.language}</span>
                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-neutral-300 hover:bg-neutral-800" onClick={() => handleCopyCode(blk.content, idx)} aria-label={`Copy ${blk.language} code`}>
                                                      <Copy className="w-3.5 h-3.5 mr-1" /> {copiedBlock === idx ? 'Copied' : 'Copy code'}
                                                    </Button>
                                                  </div>
                                                  <pre className="text-sm leading-6 whitespace-pre overflow-auto p-3">
                                                    <code>{blk.content}</code>
                                                  </pre>
                                                </div>
                                              ) : (
                                                <p key={idx} className="whitespace-pre-wrap" style={{color: 'var(--token-text-primary)'}}>
                                                  {transformListFormatting(blk.content)}
                                                </p>
                                              )
                                            ))}
                                            {(isCurrentlyStreaming || (isStreaming && displayedContent.length < message.content.length)) && (
                                              <span className="inline-block w-0.5 h-4 bg-gray-800 dark:bg-gray-200 ml-0.5 align-text-bottom animate-pulse" style={{ animation: 'blink 1s infinite' }} />
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Message actions toolbar (assistant) */}
                                  {!isLoading && !isCurrentlyStreaming && (
                                    <div className="mt-2 flex items-center gap-2 text-token-text-secondary">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard} aria-label="Copy message">
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Thumbs up">
                                        <ThumbsUp className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Thumbs down">
                                        <ThumbsDown className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Upload or share">
                                        <Upload className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Regenerate">
                                        <RefreshCcw className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                      {copied && (
                                        <span className="text-xs text-token-text-secondary ml-2">Copied!</span>
                                      )}
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
