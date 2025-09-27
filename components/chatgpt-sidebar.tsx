"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { 
  Search, 
  BookOpen, 
  Plus,
  Sparkles,
  Menu,
  MoreHorizontal,
  Trash2,
  Edit,
  Archive,
  Share
} from "lucide-react"
import { useChatStore } from "../lib/chat-store"
import { useUser } from "@clerk/nextjs"

interface ChatGPTSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function ChatGPTSidebar({ isCollapsed, onToggle }: ChatGPTSidebarProps) {
  const { chats, activeChat, createNewChat, setActiveChat } = useChatStore()
  const { user } = useUser()

  const handleCreateNewChat = () => {
    createNewChat()
  }

  if (isCollapsed) {
    return (
      <div className="group/tiny-bar flex h-full w-16 flex-col items-start pb-1.5 motion-safe:transition-colors" style={{backgroundColor: 'var(--token-sidebar-surface-primary)'}}>
        {/* Header with toggle button */}
        <div className="h-14 flex items-center justify-center w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="group __menu-item hoverable gap-1.5"
            aria-label="Open sidebar"
          >
            <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
              <Menu className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
            </div>
          </Button>
        </div>

        {/* Navigation Icons */}
        <div className="mt-4 w-full">
          <div className="mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateNewChat}
              className="group __menu-item hoverable w-full"
              aria-label="New chat"
            >
              <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
                <Plus className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
              </div>
            </Button>
          </div>
          
          <div className="mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="group __menu-item hoverable w-full"
              aria-label="Search chats"
            >
              <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
                <Search className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
              </div>
            </Button>
          </div>

          <div className="mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="group __menu-item hoverable w-full"
              aria-label="Library"
            >
              <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
                <BookOpen className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
              </div>
            </Button>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-auto w-full">
          <div className="mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="group __menu-item hoverable w-full"
              aria-label="Upgrade"
            >
              <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
                <Sparkles className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
              </div>
            </Button>
          </div>
          
          <div className="mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="group __menu-item hoverable w-full p-2"
              aria-label="Profile"
            >
              <div className="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon-lg">
                <div className="flex overflow-hidden rounded-full select-none bg-gray-500/30 h-6 w-6 shrink-0">
                  <div className="flex h-full w-full items-center justify-center bg-blue-300 text-white dark:bg-blue-500">
                    <div className="text-xs">{user?.firstName?.charAt(0) || 'H'}</div>
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col" style={{backgroundColor: 'var(--token-sidebar-surface-primary)'}}>
      {/* Header with toggle and new chat */}
      <div className="flex h-14 items-center justify-between px-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="rounded-lg hoverable"
            aria-label="Close sidebar"
          >
            <Menu className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
          </Button>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateNewChat}
            className="rounded-lg hoverable"
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
          </Button>
        </div>
      </div>

      {/* Today/Yesterday sections with search */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-3 pb-3">
            
            {/* Search functionality */}
            <div className="mb-2">
              <Button
                variant="ghost" 
                className="w-full h-9 justify-start gap-2 rounded-lg text-sm"
                style={{color: 'var(--token-text-secondary)'}}
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>

            {/* Chat history sections */}
            {chats.length > 0 && (
              <div className="space-y-1">
                {/* Today section */}
                <div className="mb-2">
                  <div className="mb-2 flex h-9 items-center">
                    <h3 className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--token-text-tertiary)'}}>
                      Today
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {chats.slice(0, 3).map((chat) => (
                      <div key={chat.id} className="group relative">
                        <Button
                          variant={activeChat === chat.id ? "secondary" : "ghost"}
                          className="w-full h-10 justify-start text-left rounded-lg px-3 pr-8 group-hover:pr-8"
                          onClick={() => setActiveChat(chat.id)}
                          style={{
                            backgroundColor: activeChat === chat.id ? 'var(--token-sidebar-surface-secondary)' : 'transparent'
                          }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
                                {chat.title}
                              </div>
                            </div>
                          </div>
                        </Button>
                        {/* Actions menu (visible on hover) */}
                        <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md"
                            aria-label="Chat actions"
                          >
                            <MoreHorizontal className="h-4 w-4" style={{color: 'var(--token-text-secondary)'}} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yesterday section */}
                {chats.length > 3 && (
                  <div className="mb-2">
                    <div className="mb-2 flex h-9 items-center">
                      <h3 className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--token-text-tertiary)'}}>
                        Yesterday  
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {chats.slice(3, 6).map((chat) => (
                        <div key={chat.id} className="group relative">
                          <Button
                            variant={activeChat === chat.id ? "secondary" : "ghost"}
                            className="w-full h-10 justify-start text-left rounded-lg px-3 pr-8 group-hover:pr-8"
                            onClick={() => setActiveChat(chat.id)}
                            style={{
                              backgroundColor: activeChat === chat.id ? 'var(--token-sidebar-surface-secondary)' : 'transparent'
                            }}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
                                  {chat.title}
                                </div>
                              </div>
                            </div>
                          </Button>
                          {/* Actions menu (visible on hover) */}
                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              aria-label="Chat actions"
                            >
                              <MoreHorizontal className="h-4 w-4" style={{color: 'var(--token-text-secondary)'}} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous 7 Days section */}
                {chats.length > 6 && (
                  <div className="mb-2">
                    <div className="mb-2 flex h-9 items-center">
                      <h3 className="text-xs font-medium uppercase tracking-wider" style={{color: 'var(--token-text-tertiary)'}}>
                        Previous 7 Days
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {chats.slice(6).map((chat) => (
                        <div key={chat.id} className="group relative">
                          <Button
                            variant={activeChat === chat.id ? "secondary" : "ghost"}
                            className="w-full h-10 justify-start text-left rounded-lg px-3 pr-8 group-hover:pr-8"
                            onClick={() => setActiveChat(chat.id)}
                            style={{
                              backgroundColor: activeChat === chat.id ? 'var(--token-sidebar-surface-secondary)' : 'transparent'
                            }}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
                                  {chat.title}
                                </div>
                              </div>
                            </div>
                          </Button>
                          {/* Actions menu (visible on hover) */}
                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              aria-label="Chat actions"
                            >
                              <MoreHorizontal className="h-4 w-4" style={{color: 'var(--token-text-secondary)'}} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom navigation section */}
      <div className="border-t p-2" style={{borderColor: 'var(--token-border-light)'}}>
        <div className="space-y-1">
          {/* Upgrade to Plus */}
          <Button
            variant="ghost"
            className="w-full h-10 justify-start gap-3 rounded-lg px-3 hoverable"
          >
            <Sparkles className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
            <span className="text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
              Upgrade plan
            </span>
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            className="w-full h-10 justify-start gap-3 rounded-lg px-3 hoverable"
          >
            <Archive className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
            <span className="text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
              Archive
            </span>
          </Button>

          {/* User profile */}
          <Button
            variant="ghost"
            className="w-full h-10 justify-start gap-3 rounded-lg px-3 hoverable"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{backgroundColor: 'var(--token-surface-primary)'}}>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                <span className="text-xs font-medium">{user?.firstName?.charAt(0) || 'H'}</span>
              </div>
            </div>
            <span className="truncate text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
              {user?.firstName || 'harshit'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}