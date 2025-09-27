"use client"

import { useCallback, useState } from "react"
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
  Sidebar
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

export function ChatSidebar({ onClose, isCollapsed = false, onToggle }: ChatSidebarProps) {
  const { chats, activeChat, createNewChat, deleteChat, renameChat, setActiveChat } = useChatStore()
  const { user } = useUser()
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    chatId: null,
    currentTitle: ''
  })
  const [newTitle, setNewTitle] = useState('')

  const handleCreateNewChat = useCallback(() => {
    createNewChat()
  }, [createNewChat])

  const handleDeleteChat = useCallback((chatId: string) => {
    deleteChat(chatId)
  }, [deleteChat])

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
    setActiveChat(chatId)
  }, [setActiveChat])

  const getUserDisplayName = useCallback(() => {
    return user?.firstName ?? user?.username ?? 'User'
  }, [user?.firstName, user?.username])


  return (
    <div className="h-full bg-[#171717] flex flex-col w-64">
      {/* Header with Logo and Collapse Button */}
      <div className="p-3 flex items-center justify-between">
        <img 
          src="/gpt_icon.png" 
          alt="Logo" 
          className="w-8 h-8 rounded-lg object-cover"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-gray-800">
          <Sidebar className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Section */}
      <div className="px-3 py-2 space-y-1">
        <Button
          onClick={handleCreateNewChat}
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-white font-normal rounded-lg"
          variant="ghost"
        >
          <Edit3 className="h-4 w-4" />
          New chat
        </Button>

        <Button
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-gray-300 font-normal rounded-lg"
          variant="ghost"
        >
          <Search className="h-4 w-4" />
          Search chats
        </Button>

        <Button
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-gray-300 font-normal rounded-lg"
          variant="ghost"
        >
          <BookOpen className="h-4 w-4" />
          Library
        </Button>
      </div>

      {/* Separator */}
      <div className="mx-3 my-2 border-t border-gray-700"></div>

      {/* Additional Navigation */}
      <div className="px-3 py-2 space-y-1">
        <Button
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-gray-300 font-normal rounded-lg"
          variant="ghost"
        >
          <Play className="h-4 w-4" />
          Sora
        </Button>

        <Button
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-gray-300 font-normal rounded-lg"
          variant="ghost"
        >
          <Grid3X3 className="h-4 w-4" />
          GPTs
        </Button>

        <Button
          className="w-full justify-start gap-3 h-10 bg-transparent hover:bg-gray-800 text-gray-300 font-normal rounded-lg relative"
          variant="ghost"
        >
          <FolderOpen className="h-4 w-4" />
          Projects
          <span className="absolute right-3 top-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-medium">
            NEW
          </span>
        </Button>
      </div>

      {/* Chats Section */}
      <div className="flex-1 px-3 py-2">
        <div className="text-gray-400 text-sm font-medium mb-3 px-2">Chats</div>
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeChat === chat.id
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800 text-gray-300"
                } text-sm`}
                onClick={() => handleChatSelect(chat.id)}
              >
                <span className="flex-1 truncate">{chat.title}</span>
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
                        handleRenameChat(chat.id, chat.title)
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChat(chat.id)
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                No chats yet. Create your first chat!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* User section */}
      <div className="p-3 border-t border-gray-700">
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
              <span className="text-sm text-white font-medium">
                {getUserDisplayName()}
              </span>
              <span className="text-xs text-gray-400">Free</span>
            </div>
          </div>
          <Button
            variant="ghost" 
            size="sm"
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 h-7 rounded-md"
          >
            Upgrade
          </Button>
        </div>
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
    </div>
  )
}
