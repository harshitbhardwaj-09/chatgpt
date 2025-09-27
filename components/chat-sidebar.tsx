"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useChatStore } from "../lib/chat-store"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { UserButton, useUser } from "@clerk/nextjs"
import { 
  Search, 
  BookOpen, 
  Play, 
  Grid3X3, 
  FolderOpen, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Sidebar,
  X
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { ThemeToggle } from "./theme-toggle"

interface ChatSidebarProps {
  readonly onClose: () => void
  readonly isCollapsed?: boolean
  readonly onToggle?: () => void
}

interface RenameDialogState {
  isOpen: boolean
  chatId: string | null
  currentTitle: string
}

interface DeleteDialogState {
  isOpen: boolean
  chatId: string | null
  chatTitle: string
}

export function ChatSidebar({ onClose, isCollapsed = false, onToggle }: ChatSidebarProps) {
  const router = useRouter()
  const { 
    chats, 
    activeChat, 
    createNewChat, 
    deleteChat, 
    renameChat, 
    setActiveChat,
    searchState,
    searchChats,
    clearSearch,
    addRecentSearch,
    getFilteredChats
  } = useChatStore()
  const { user } = useUser()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    chatId: null,
    currentTitle: ''
  })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    chatId: null,
    chatTitle: ''
  })
  const [newTitle, setNewTitle] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const handleCreateNewChat = useCallback(() => {
    // Create new temporary chat and navigate to home page
    createNewChat()
    router.push('/')
  }, [router, createNewChat])

  const handleDeleteChat = useCallback((chatId: string, chatTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      chatId,
      chatTitle
    })
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.chatId) {
      deleteChat(deleteDialog.chatId)
      // If deleting active chat, navigate to home
      if (deleteDialog.chatId === activeChat) {
        router.push('/')
      }
    }
    setDeleteDialog({ isOpen: false, chatId: null, chatTitle: '' })
  }, [deleteDialog.chatId, deleteChat, activeChat, router])

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ isOpen: false, chatId: null, chatTitle: '' })
  }, [])

  const handleRenameChat = useCallback((chatId: string, currentTitle: string) => {
    setRenameDialog({
      isOpen: true,
      chatId,
      currentTitle
    })
    setNewTitle(currentTitle)
  }, [])

  const handleRenameConfirm = useCallback(() => {
    if (renameDialog.chatId && newTitle.trim()) {
      renameChat(renameDialog.chatId, newTitle.trim())
    }
    setRenameDialog({ isOpen: false, chatId: null, currentTitle: '' })
    setNewTitle('')
  }, [renameDialog.chatId, newTitle, renameChat])

  const handleRenameCancel = useCallback(() => {
    setRenameDialog({ isOpen: false, chatId: null, currentTitle: '' })
    setNewTitle('')
  }, [])

  const handleChatSelect = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId)
    
    // If it's a temporary chat, navigate to home page
    if (chat?.isTemporary) {
      setActiveChat(chatId)
      router.push('/')
    } else {
      // Navigate to conversation URL for permanent chats
      router.push(`/c/${chatId}`)
    }
  }, [router, chats, setActiveChat])

  const getUserDisplayName = useCallback(() => {
    return user?.firstName ?? user?.username ?? 'User'
  }, [user?.firstName, user?.username])

  // Search handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    searchChats(query)
    setShowSearchResults(query.length > 0)
  }, [searchChats])

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchState.query.trim()) {
      addRecentSearch(searchState.query.trim())
    }
  }, [searchState.query, addRecentSearch])

  const handleSearchClear = useCallback(() => {
    clearSearch()
    setShowSearchResults(false)
    setIsSearchFocused(false)
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
  }, [clearSearch])

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true)
    if (searchState.query) {
      setShowSearchResults(true)
    }
  }, [searchState.query])

  const handleSearchBlur = useCallback(() => {
    // Delay hiding search results to allow for clicks
    setTimeout(() => {
      setIsSearchFocused(false)
      if (!searchState.query) {
        setShowSearchResults(false)
      }
    }, 200)
  }, [searchState.query])

  // Get filtered chats based on search and window context
  const filteredChats = getFilteredChats()


  return (
    <div className={`h-full bg-token-sidebar-surface-primary border-r border-token-border-light flex flex-col transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header with Logo and Collapse Button */}
      <div className={`p-3 flex items-center ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {isCollapsed ? (
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 text-token-text-secondary hover:bg-token-sidebar-surface-secondary"
             onClick={onToggle}
             title="Expand sidebar"
          >
            <img 
              src="/gpt_iconw.png" 
              alt="ChatGPT Logo" 
              className="w-6 h-6 rounded-lg object-cover dark:hidden"
            />
            <img 
              src="/gpt_icon.png" 
              alt="ChatGPT Logo" 
              className="w-6 h-6 rounded-lg object-cover hidden dark:block"
            />
          </Button>
        ) : (
          <>
            <img 
              src="/gpt_iconw.png" 
              alt="ChatGPT Logo" 
              className="w-8 h-8 rounded-lg object-cover dark:hidden"
            />
            <img 
              src="/gpt_icon.png" 
              alt="ChatGPT Logo" 
              className="w-8 h-8 rounded-lg object-cover hidden dark:block"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-token-text-secondary hover:bg-token-sidebar-surface-secondary"
              onClick={onToggle}
              title="Collapse sidebar"
            >
              <Sidebar className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation Section */}
      <div className="px-3 py-2 space-y-1">
        <Button
          onClick={handleCreateNewChat}
          className={`w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-primary font-normal rounded-lg ${
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          }`}
          variant="ghost"
          title={isCollapsed ? 'New chat' : undefined}
        >
          <Edit3 className="h-4 w-4" />
          {!isCollapsed && 'New chat'}
        </Button>

          {isCollapsed ? (
            <Button
              className="w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-secondary font-normal rounded-lg justify-center px-0"
              variant="ghost"
              title="Search chats"
              onClick={() => searchInputRef.current?.focus()}
            >
              <Search className="h-4 w-4" />
            </Button>
          ) : (
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search chats"
                  value={searchState.query}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  className="w-full h-10 bg-transparent border border-token-border-light hover:bg-token-sidebar-surface-secondary text-token-text-primary placeholder-token-text-secondary font-normal rounded-lg pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-token-text-secondary" />
                {searchState.query && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-token-sidebar-surface-secondary rounded transition-colors"
                  >
                    <X className="h-3 w-3 text-token-text-secondary" />
                  </button>
                )}
              </form>
            </div>
          )}

        <Button
          className={`w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-secondary font-normal rounded-lg ${
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          }`}
          variant="ghost"
          title={isCollapsed ? 'Library' : undefined}
        >
          <BookOpen className="h-4 w-4" />
          {!isCollapsed && 'Library'}
        </Button>
      </div>

      {/* Separator */}
      {!isCollapsed && <div className="mx-3 my-2 border-t border-token-border-light"></div>}

      {/* Additional Navigation */}
      <div className="px-3 py-2 space-y-1">
        <Button
          className={`w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-secondary font-normal rounded-lg ${
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          }`}
          variant="ghost"
          title={isCollapsed ? 'Sora' : undefined}
        >
          <Play className="h-4 w-4" />
          {!isCollapsed && 'Sora'}
        </Button>

        <Button
          className={`w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-secondary font-normal rounded-lg ${
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          }`}
          variant="ghost"
          title={isCollapsed ? 'GPTs' : undefined}
        >
          <Grid3X3 className="h-4 w-4" />
          {!isCollapsed && 'GPTs'}
        </Button>

        <Button
          className={`w-full h-10 bg-transparent hover:bg-token-sidebar-surface-secondary text-token-text-secondary font-normal rounded-lg relative ${
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'
          }`}
          variant="ghost"
          title={isCollapsed ? 'Projects' : undefined}
        >
          <FolderOpen className="h-4 w-4" />
          {!isCollapsed && 'Projects'}
          {!isCollapsed && (
            <span className="absolute right-3 top-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-medium">
              NEW
            </span>
          )}
        </Button>
      </div>

      {/* Chats Section */}
       {!isCollapsed && (
         <div className="flex-1 px-3 py-2">
           <div className="flex items-center justify-between mb-3 px-2">
             <div className="text-token-text-secondary text-sm font-medium">
               {searchState.isSearching ? (
                 `Search results (${filteredChats.length})`
               ) : (
                 'Chats'
               )}
             </div>
             {searchState.isSearching && searchState.query && (
               <button
                 onClick={handleSearchClear}
                 className="text-xs text-token-text-secondary hover:text-token-text-primary transition-colors"
               >
                 Clear
               </button>
             )}
           </div>
           <ScrollArea className="h-full">
             <div className="space-y-1">
               {filteredChats.length === 0 && searchState.isSearching ? (
                 <div className="text-center text-token-text-secondary text-sm py-8">
                   <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                   <p>No chats found for "{searchState.query}"</p>
                   <p className="text-xs mt-1 opacity-75">Try a different search term</p>
                 </div>
               ) : filteredChats.length === 0 ? (
                 <div className="text-center text-gray-400 text-sm py-8">
                   No chats yet. Create your first chat!
                 </div>
               ) : (
                 filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeChat === chat.id
                      ? "bg-token-sidebar-surface-secondary text-token-text-primary"
                      : "hover:bg-token-sidebar-surface-secondary text-token-text-secondary"
                  } text-sm`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <span className="flex-1 truncate">{chat.title}</span>
                  {chat.isTemporary && !chat.permanentId && (
                    <span className="text-xs text-token-text-tertiary opacity-60">•</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenameChat(chat.id, chat.title || 'Untitled Chat')
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChat(chat.id, chat.title || 'Untitled Chat')
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                 ))
               )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* User section */}
      <div className={`p-3 border-t border-token-border-light ${
        isCollapsed ? 'flex flex-col items-center gap-2' : ''
      }`}>
        {isCollapsed ? (
          <>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            <ThemeToggle />
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm text-token-text-primary font-medium">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-xs text-token-text-secondary">Free</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost" 
                  size="sm"
                  className="text-xs bg-token-sidebar-surface-secondary hover:bg-token-sidebar-surface-tertiary text-token-text-primary px-3 py-1 h-7 rounded-md"
                >
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.isOpen} onOpenChange={handleRenameCancel}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for your chat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm()
                  }
                  if (e.key === 'Escape') {
                    handleRenameCancel()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRenameCancel}>
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.chatTitle}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
