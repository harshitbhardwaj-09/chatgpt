import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Chat {
  id: string
  title: string
  timestamp: Date
  messages: Array<{
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
  }>
}

interface ChatStore {
  chats: Chat[]
  activeChat: string | null
  createNewChat: () => string
  deleteChat: (chatId: string) => void
  renameChat: (chatId: string, newTitle: string) => void
  setActiveChat: (chatId: string) => void
  addMessageToChat: (chatId: string, message: { content: string; role: "user" | "assistant" }) => void
  getCurrentChat: () => Chat | null
  generateChatTitle: (firstMessage: string) => string
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,

      createNewChat: () => {
        const newChat: Chat = {
          id: Date.now().toString(),
          title: "New chat",
          timestamp: new Date(),
          messages: [],
        }
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat.id,
        }))
        return newChat.id
      },

      deleteChat: (chatId: string) => {
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
      },

      setActiveChat: (chatId: string) => {
        set({ activeChat: chatId })
      },

      addMessageToChat: (chatId: string, message: { content: string; role: "user" | "assistant" }) => {
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
