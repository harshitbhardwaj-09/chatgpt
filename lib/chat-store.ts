import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant" | "system"
  timestamp: Date
  tokenCount?: number
  status?: "pending" | "done" | "error" | "streaming"
  isEdited?: boolean
  editedAt?: Date
  parentMessageId?: string
}

export interface Chat {
  id: string
  title?: string
  timestamp: Date
  lastMessageAt: Date
  messages: ChatMessage[]
  messageCount: number
  tokenCount: number
  isArchived: boolean
  isPinned: boolean
  aiModel: string
  systemPrompt?: string
  windowId?: string  // Track which window/session created this chat
  metadata?: {
    source: 'web' | 'mobile' | 'api'
    sessionId?: string
    windowInfo?: string
  }
}

interface EditState {
  messageId: string | null
  originalContent: string
  editedContent: string
  isEditing: boolean
}

interface StreamingState {
  isStreaming: boolean
  streamingMessageId: string | null
  streamingContent: string
  streamingChatId: string | null
}

interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSyncError: string | null
  pendingSync: string[]
}

interface WindowState {
  windowId: string
  sessionStartTime: Date
  isActiveWindow: boolean
}

interface ChatStore {
  chats: Chat[]
  activeChat: string | null
  editState: EditState
  streamingState: StreamingState
  syncState: SyncState
  windowState: WindowState
  // Window management
  initializeWindow: () => void
  setActiveWindow: (isActive: boolean) => void
  createNewChat: () => string
  deleteChat: (chatId: string) => void
  renameChat: (chatId: string, newTitle: string) => void
  setActiveChat: (chatId: string) => void
  addMessageToChat: (chatId: string, message: { content: string; role: "user" | "assistant" }) => void
  getCurrentChat: () => Chat | null
  generateChatTitle: (firstMessage: string) => string
  // Edit functionality
  startEditingMessage: (messageId: string, content: string) => void
  updateEditedContent: (content: string) => void
  cancelEditing: () => void
  saveEditedMessage: (chatId: string, messageId: string, newContent: string) => void
  removeMessagesFromIndex: (chatId: string, fromIndex: number) => void
  // Streaming functionality
  startStreaming: (chatId: string, messageId: string) => void
  updateStreamingContent: (content: string) => void
  finishStreaming: () => void
  cancelStreaming: () => void
  updateMessageContent: (chatId: string, messageId: string, content: string) => void
  // Database sync functionality
  loadConversationsFromDB: () => Promise<void>
  syncChatToDB: (chatId: string) => Promise<void>
  syncMessageToDB: (chatId: string, message: { content: string; role: "user" | "assistant" }) => Promise<void>
  syncEditToDB: (chatId: string, messageId: string, content: string) => Promise<void>
  deleteChatFromDB: (chatId: string) => Promise<void>
  // Sync state management
  setSyncError: (error: string | null) => void
  setOnlineStatus: (isOnline: boolean) => void
  retrySyncOperations: () => Promise<void>
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,
      editState: {
        messageId: null,
        originalContent: "",
        editedContent: "",
        isEditing: false,
      },
      streamingState: {
        isStreaming: false,
        streamingMessageId: null,
        streamingContent: "",
        streamingChatId: null,
      },
      syncState: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isSyncing: false,
        lastSyncError: null,
        pendingSync: [],
      },
      windowState: {
        windowId: typeof window !== 'undefined' ? `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : 'server',
        sessionStartTime: new Date(),
        isActiveWindow: typeof document !== 'undefined' ? !document.hidden : true,
      },

      // Window management methods
      initializeWindow: () => {
        const windowId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          windowState: {
            ...state.windowState,
            windowId,
            sessionStartTime: new Date(),
            isActiveWindow: true,
          }
        }));
        
        // Set up window focus/blur listeners
        if (typeof window !== 'undefined') {
          const handleFocus = () => get().setActiveWindow(true);
          const handleBlur = () => get().setActiveWindow(false);
          const handleVisibilityChange = () => {
            get().setActiveWindow(!document.hidden);
          };
          
          window.addEventListener('focus', handleFocus);
          window.addEventListener('blur', handleBlur);
          document.addEventListener('visibilitychange', handleVisibilityChange);
          
          // Cleanup function could be returned here if needed
        }
      },

      setActiveWindow: (isActive: boolean) => {
        set((state) => ({
          windowState: {
            ...state.windowState,
            isActiveWindow: isActive,
          }
        }));
      },

      createNewChat: () => {
        const now = new Date()
        const state = get()
        const newChat: Chat = {
          id: Date.now().toString(),
          title: "New Conversation",
          timestamp: now,
          lastMessageAt: now,
          messages: [],
          messageCount: 0,
          tokenCount: 0,
          isArchived: false,
          isPinned: false,
          aiModel: "gemini-2.5-flash",
          windowId: state.windowState.windowId,
          metadata: {
            source: 'web',
            sessionId: state.windowState.windowId,
            windowInfo: `Session started: ${state.windowState.sessionStartTime.toISOString()}`
          }
        }
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat.id,
        }))
        
        // Sync to database
        get().syncChatToDB(newChat.id)
        return newChat.id
      },

      deleteChat: (chatId: string) => {
        // Delete from database first
        get().deleteChatFromDB(chatId)
        
        set((state) => {
          const newChats = state.chats.filter((chat) => chat.id !== chatId)
          const newActiveChat =
            state.activeChat === chatId ? (newChats.length > 0 ? newChats[0].id : null) : state.activeChat
          return {
            chats: newChats,
            activeChat: newActiveChat,
          }
        })
      },

      renameChat: (chatId: string, newTitle: string) => {
        set((state) => ({
          chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat)),
        }))
        
        // Sync title change to database
        fetch(`/api/conversations/${chatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        }).catch(error => console.error('Failed to sync title change:', error))
      },

      setActiveChat: (chatId: string) => {
        set({ activeChat: chatId })
      },

      addMessageToChat: (chatId: string, message: { content: string; role: "user" | "assistant" }) => {
        const state = get()
        const chat = state.chats.find(c => c.id === chatId)
        
        // If this is the first message and chat doesn't exist in DB yet, create it
        if (chat && chat.messages.length === 0 && !chatId.includes('ObjectId')) {
          get().syncChatToDB(chatId).then(() => {
            // After creating chat in DB, sync the message
            const updatedState = get()
            const updatedChat = updatedState.chats.find(c => c.id === chatId || c.title === chat.title)
            if (updatedChat && message.content.trim()) {
              get().syncMessageToDB(updatedChat.id, message)
            }
          })
        } else if (message.content.trim()) {
          // Sync message to existing conversation
          get().syncMessageToDB(chatId, message)
        }

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    {
                      id: Date.now().toString(),
                      content: message.content,
                      role: message.role,
                      timestamp: new Date(),
                    },
                  ],
                }
              : chat,
          ),
        }))
      },

      getCurrentChat: () => {
        const state = get()
        return state.chats.find((chat) => chat.id === state.activeChat) || null
      },

      generateChatTitle: (firstMessage: string) => {
        // Generate a title from the first message (truncate to ~40 chars)
        const title = firstMessage.length > 40 ? firstMessage.substring(0, 40) + "..." : firstMessage
        return title
      },

      // Edit functionality
      startEditingMessage: (messageId: string, content: string) => {
        set({
          editState: {
            messageId,
            originalContent: content,
            editedContent: content,
            isEditing: true,
          },
        })
      },

      updateEditedContent: (content: string) => {
        set((state) => ({
          editState: {
            ...state.editState,
            editedContent: content,
          },
        }))
      },

      cancelEditing: () => {
        set({
          editState: {
            messageId: null,
            originalContent: "",
            editedContent: "",
            isEditing: false,
          },
        })
      },

      saveEditedMessage: (chatId: string, messageId: string, newContent: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === messageId
                      ? { ...message, content: newContent }
                      : message
                  ),
                }
              : chat
          ),
          editState: {
            messageId: null,
            originalContent: "",
            editedContent: "",
            isEditing: false,
          },
        }))
      },

      removeMessagesFromIndex: (chatId: string, fromIndex: number) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.slice(0, fromIndex),
                }
              : chat
          ),
        }))
      },

      // Streaming functionality
      startStreaming: (chatId: string, messageId: string) => {
        set((state) => ({
          streamingState: {
            isStreaming: true,
            streamingMessageId: messageId,
            streamingContent: "",
            streamingChatId: chatId,
          },
        }))
      },

      updateStreamingContent: (content: string) => {
        set((state) => {
          if (!state.streamingState.isStreaming) return state
          
          return {
            streamingState: {
              ...state.streamingState,
              streamingContent: content,
            },
            chats: state.chats.map((chat) =>
              chat.id === state.streamingState.streamingChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((message) =>
                      message.id === state.streamingState.streamingMessageId
                        ? { ...message, content }
                        : message
                    ),
                  }
                : chat
            ),
          }
        })
      },

      finishStreaming: () => {
        set((state) => ({
          streamingState: {
            isStreaming: false,
            streamingMessageId: null,
            streamingContent: "",
            streamingChatId: null,
          },
        }))
      },

      cancelStreaming: () => {
        set((state) => ({
          streamingState: {
            isStreaming: false,
            streamingMessageId: null,
            streamingContent: "",
            streamingChatId: null,
          },
        }))
      },

      updateMessageContent: (chatId: string, messageId: string, content: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === messageId
                      ? { ...message, content }
                      : message
                  ),
                }
              : chat
          ),
        }))
      },

      // Database sync functionality
      loadConversationsFromDB: async () => {
        try {
          set((state) => ({
            syncState: { ...state.syncState, isSyncing: true, lastSyncError: null }
          }))

          const response = await fetch('/api/conversations')
          if (response.ok) {
            const { conversations } = await response.json()
            
            // Convert database conversations to chat format
            const chats: Chat[] = []
            
            for (const conv of conversations) {
              // Get conversation with messages
              const convResponse = await fetch(`/api/conversations/${conv._id}`)
              if (convResponse.ok) {
                const { conversation, messages } = await convResponse.json()
                
                chats.push({
                  id: conversation._id,
                  title: conversation.title || 'New Conversation',
                  timestamp: new Date(conversation.createdAt),
                  lastMessageAt: new Date(conversation.lastMessageAt),
                  messageCount: conversation.messageCount || 0,
                  tokenCount: conversation.tokenCount || 0,
                  isArchived: conversation.isArchived || false,
                  isPinned: conversation.isPinned || false,
                  aiModel: conversation.aiModel || 'gemini-2.5-flash',
                  systemPrompt: conversation.systemPrompt,
                  messages: messages?.map((msg: any) => ({
                    id: msg._id,
                    content: msg.content,
                    role: msg.role,
                    timestamp: new Date(msg.createdAt),
                    tokenCount: msg.tokenCount,
                    status: msg.status || 'done',
                    isEdited: msg.isEdited || false,
                    editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
                    parentMessageId: msg.parentMessageId
                  })) || [],
                })
              }
            }

            set((state) => ({ 
              chats: chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()),
              syncState: { ...state.syncState, isSyncing: false }
            }))
          } else {
            throw new Error(`Failed to load conversations: ${response.status}`)
          }
        } catch (error) {
          console.error('Failed to load conversations from database:', error)
          get().setSyncError(error instanceof Error ? error.message : 'Failed to load conversations')
        }
      },

      syncChatToDB: async (chatId: string) => {
        try {
          const state = get()
          const chat = state.chats.find(c => c.id === chatId)
          if (!chat) return

          // Create conversation in database
          const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: chat.title })
          })

          if (!response.ok) {
            throw new Error('Failed to create conversation in database')
          }

          const { conversation } = await response.json()
          
          // Update local chat with database ID
          set((state) => ({
            chats: state.chats.map((c) =>
              c.id === chatId ? { ...c, id: conversation._id } : c
            ),
            activeChat: state.activeChat === chatId ? conversation._id : state.activeChat
          }))
        } catch (error) {
          console.error('Failed to sync chat to database:', error)
        }
      },

      syncMessageToDB: async (chatId: string, message: { content: string; role: "user" | "assistant" }) => {
        try {
          const response = await fetch(`/api/conversations/${chatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: message.role,
              content: message.content
            })
          })

          if (!response.ok) {
            throw new Error('Failed to sync message to database')
          }
        } catch (error) {
          console.error('Failed to sync message to database:', error)
        }
      },

      syncEditToDB: async (chatId: string, messageId: string, content: string) => {
        try {
          const response = await fetch(`/api/conversations/${chatId}/messages`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId,
              content
            })
          })

          if (!response.ok) {
            throw new Error('Failed to sync edit to database')
          }
        } catch (error) {
          console.error('Failed to sync edit to database:', error)
        }
      },

      deleteChatFromDB: async (chatId: string) => {
        try {
          const response = await fetch(`/api/conversations/${chatId}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            throw new Error('Failed to delete conversation from database')
          }
        } catch (error) {
          console.error('Failed to delete conversation from database:', error)
        }
      },

      // Sync state management
      setSyncError: (error: string | null) => {
        set((state) => ({
          syncState: {
            ...state.syncState,
            lastSyncError: error,
            isSyncing: false,
          },
        }))
      },

      setOnlineStatus: (isOnline: boolean) => {
        set((state) => ({
          syncState: {
            ...state.syncState,
            isOnline,
          },
        }))
        
        // If coming back online, retry pending sync operations
        if (isOnline) {
          get().retrySyncOperations()
        }
      },

      retrySyncOperations: async () => {
        const state = get()
        if (!state.syncState.isOnline || state.syncState.isSyncing || state.syncState.pendingSync.length === 0) {
          return
        }

        set((state) => ({
          syncState: {
            ...state.syncState,
            isSyncing: true,
          },
        }))

        // Retry pending operations (simplified implementation)
        try {
          await get().loadConversationsFromDB()
          
          set((state) => ({
            syncState: {
              ...state.syncState,
              isSyncing: false,
              pendingSync: [],
              lastSyncError: null,
            },
          }))
        } catch (error) {
          get().setSyncError('Failed to sync with database')
        }
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        chats: state.chats,
        activeChat: state.activeChat,
      }),
    },
  ),
)
