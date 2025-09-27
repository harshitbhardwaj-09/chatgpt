import connectDB from './mongodb'
import User, { IUser } from '../models/User'
import Conversation, { IConversation, MessageRole } from '../models/Conversation'

// Type for partial conversation data (used in getUserConversations)
export interface IConversationSummary {
  _id: string
  title: string
  createdAt: Date
  lastMessageAt: Date
}

/**
 * User operations
 */
export class UserService {
  static async findOrCreateUser(clerkUser: {
    id: string
    emailAddresses: Array<{ emailAddress: string }>
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    imageUrl?: string | null
  }): Promise<IUser> {
    await connectDB()
    
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (!email) {
      throw new Error('User email is required')
    }

    let user = await User.findOne({ clerkId: clerkUser.id })
    
    if (!user) {
      user = await User.create({
        clerkId: clerkUser.id,
        email,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        username: clerkUser.username || undefined,
        avatar: clerkUser.imageUrl || undefined
      })
    } else {
      // Update user info if it has changed
      const updates: Partial<IUser> = {}
      if (user.email !== email) updates.email = email
      if (user.firstName !== clerkUser.firstName) updates.firstName = clerkUser.firstName || undefined
      if (user.lastName !== clerkUser.lastName) updates.lastName = clerkUser.lastName || undefined
      if (user.username !== clerkUser.username) updates.username = clerkUser.username || undefined
      if (user.avatar !== clerkUser.imageUrl) updates.avatar = clerkUser.imageUrl || undefined
      
      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true })!
      }
    }
    
    return user
  }

  static async findByClerkId(clerkId: string): Promise<IUser | null> {
    await connectDB()
    return User.findOne({ clerkId })
  }
}

/**
 * Conversation operations
 */
export class ConversationService {
  static async createConversation(clerkUserId: string, title?: string): Promise<IConversation> {
    await connectDB()
    
    const user = await User.findOne({ clerkId: clerkUserId })
    if (!user) {
      throw new Error('User not found')
    }

    const conversation = await Conversation.create({
      user: user._id,
      clerkUserId,
      title: title || 'New Chat',
      messages: []
    })

    return conversation
  }

  static async getUserConversations(clerkUserId: string): Promise<IConversationSummary[]> {
    await connectDB()
    const conversations = await Conversation.find({ clerkUserId })
      .sort({ lastMessageAt: -1 })
      .select('_id title createdAt lastMessageAt')
      .lean()
    
    return conversations as unknown as IConversationSummary[]
  }

  static async getConversationById(clerkUserId: string, conversationId: string): Promise<IConversation | null> {
    await connectDB()
    return Conversation.findOne({ _id: conversationId, clerkUserId })
  }

  static async addMessage(
    clerkUserId: string, 
    conversationId: string, 
    role: MessageRole, 
    content: string
  ): Promise<IConversation | null> {
    await connectDB()
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId })
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    conversation.messages.push({
      role,
      content,
      createdAt: new Date()
    })
    conversation.lastMessageAt = new Date()

    await conversation.save()
    return conversation
  }

  static async updateConversationTitle(
    clerkUserId: string, 
    conversationId: string, 
    title: string
  ): Promise<IConversation | null> {
    await connectDB()
    
    return Conversation.findOneAndUpdate(
      { _id: conversationId, clerkUserId },
      { title: title.trim() },
      { new: true }
    )
  }

  static async deleteConversation(clerkUserId: string, conversationId: string): Promise<boolean> {
    await connectDB()
    
    const result = await Conversation.deleteOne({ _id: conversationId, clerkUserId })
    return result.deletedCount > 0
  }

  static async getMessagesForOpenAI(clerkUserId: string, conversationId: string) {
    await connectDB()
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId })
    if (!conversation) {
      throw new Error('Conversation not found')
    }

        return conversation.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt
    }))
  }

  static async generateTitle(messages: Array<{ role: string; content: string }>): Promise<string> {
    // Generate a title from the first user message
    const firstUserMessage = messages.find(msg => msg.role === 'user')
    if (!firstUserMessage) return 'New Chat'
    
    const content = firstUserMessage.content.trim()
    if (content.length <= 50) return content
    
    // Truncate and add ellipsis
    return content.substring(0, 47) + '...'
  }
}

/**
 * Database health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await connectDB()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

