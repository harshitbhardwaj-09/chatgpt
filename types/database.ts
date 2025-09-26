import { Types } from 'mongoose'

export type MessageRole = 'system' | 'user' | 'assistant'

export interface DatabaseMessage {
  _id?: Types.ObjectId
  role: MessageRole
  content: string
  createdAt: Date
}

export interface DatabaseConversation {
  _id: Types.ObjectId
  user: Types.ObjectId
  clerkUserId: string
  title: string
  messages: DatabaseMessage[]
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
}

export interface DatabaseUser {
  _id: Types.ObjectId
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// OpenAI API types
export interface OpenAIMessage {
  role: MessageRole
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// API Response types for frontend
export interface ConversationSummary {
  _id: string
  title: string
  createdAt: string
  lastMessageAt: string
}

export interface ConversationDetail {
  _id: string
  title: string
  messages: Array<{
    _id: string
    role: MessageRole
    content: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

