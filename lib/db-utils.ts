import { auth } from '@clerk/nextjs/server';
import connectDB from './mongodb';
import User, { IUser } from '../models/User';
import Conversation, { IConversation } from '../models/Conversation';
import Message, { IMessage } from '../models/Message';
import UsageLog, { IUsageLog } from '../models/UsageLog';

// Type for partial conversation data (used in getUserConversations)
export interface IConversationSummary {
  _id: string;
  title: string;
  messageCount: number;
  tokenCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  lastMessageAt: Date;
}

// User Service
export class UserService {
  /**
   * Find or create user based on Clerk authentication
   */
  static async findOrCreateFromClerk(): Promise<IUser> {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      throw new Error('User not authenticated');
    }

    await connectDB();

    let user = await User.findOne({ clerkId });
    
    if (!user) {
      // Get user data from Clerk
      const { clerkClient } = require('@clerk/nextjs/server');
      const clerkUser = await clerkClient.users.getUser(clerkId);
      
      user = new User({
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        avatar: clerkUser.imageUrl,
        isActive: true,
        lastActiveAt: new Date()
      });
      
      await user.save();
    } else {
      // Update last active time
      user.lastActiveAt = new Date();
      await user.save();
    }

    return user;
  }

  /**
   * Find or create user with explicit Clerk user data
   */
  static async findOrCreateUser(clerkUser: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    imageUrl?: string | null;
  }): Promise<IUser> {
    await connectDB();
    
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new Error('User email is required');
    }

    let user = await User.findOne({ clerkId: clerkUser.id });
    
    if (!user) {
      user = await User.create({
        clerkId: clerkUser.id,
        email,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        avatar: clerkUser.imageUrl || undefined,
        isActive: true,
        lastActiveAt: new Date()
      });
    } else {
      // Update user info if it has changed
      const updates: Partial<IUser> = {};
      if (user.email !== email) updates.email = email;
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      if (user.name !== fullName) updates.name = fullName;
      if (user.avatar !== clerkUser.imageUrl) updates.avatar = clerkUser.imageUrl || undefined;
      
      if (Object.keys(updates).length > 0) {
        updates.lastActiveAt = new Date();
        Object.assign(user, updates);
        await user.save();
      }
    }

    return user;
  }

  /**
   * Get user by Clerk ID
   */
  static async getByClerkId(clerkId: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ clerkId });
  }

  /**
   * Update user profile
   */
  static async updateProfile(clerkId: string, updates: Partial<IUser>): Promise<IUser | null> {
    await connectDB();
    return User.findOneAndUpdate(
      { clerkId },
      { ...updates, lastActiveAt: new Date() },
      { new: true }
    );
  }
}

// Conversation Service
export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    clerkUserId: string,
    title?: string,
    systemPrompt?: string,
    model: string = 'gemini-2.5-flash'
  ): Promise<IConversation> {
    await connectDB();
    
    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    const conversation = new Conversation({
      userId: user._id,
      clerkUserId,
      title: title || 'New Conversation',
      systemPrompt,
      aiModel: model,
      metadata: {
        source: 'web'
      }
    });

    return conversation.save();
  }

  /**
   * Get conversations for a user
   */
  static async getUserConversations(
    clerkUserId: string,
    options: {
      includeArchived?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<IConversationSummary[]> {
    await connectDB();
    
    const query: any = { clerkUserId };
    if (!options.includeArchived) {
      query.isArchived = false;
    }
    
    const conversations = await Conversation.find(query)
      .select('_id title messageCount tokenCount isPinned isArchived createdAt lastMessageAt')
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .lean();

    return conversations as unknown as IConversationSummary[];
  }

  /**
   * Get a specific conversation with messages
   */
  static async getConversation(clerkUserId: string, conversationId: string): Promise<{
    conversation: IConversation;
    messages: IMessage[];
  } | null> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) return null;
    
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(100);

    return { conversation, messages };
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    clerkUserId: string,
    conversationId: string,
    title: string
  ): Promise<IConversation | null> {
    await connectDB();
    
    return Conversation.findOneAndUpdate(
      { _id: conversationId, clerkUserId },
      { title: title.trim().substring(0, 200) },
      { new: true }
    );
  }

  /**
   * Delete conversation and all its messages
   */
  static async deleteConversation(clerkUserId: string, conversationId: string): Promise<boolean> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) return false;
    
    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversation._id });
    
    // Delete the conversation
    await Conversation.findByIdAndDelete(conversation._id);
    
    return true;
  }

  /**
   * Archive/unarchive conversation
   */
  static async toggleArchiveConversation(
    clerkUserId: string,
    conversationId: string
  ): Promise<IConversation | null> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) return null;
    
    conversation.isArchived = !conversation.isArchived;
    return conversation.save();
  }

  /**
   * Pin/unpin conversation
   */
  static async togglePinConversation(
    clerkUserId: string,
    conversationId: string
  ): Promise<IConversation | null> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) return null;
    
    conversation.isPinned = !conversation.isPinned;
    return conversation.save();
  }
}

// Message Service
export class MessageService {
  /**
   * Add a message to a conversation
   */
  static async addMessage(
    clerkUserId: string,
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<{ message: IMessage; conversation: IConversation }> {
    await connectDB();
    
    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const tokenCount = Math.ceil(content.length / 4);

    const message = new Message({
      conversationId: conversation._id,
      userId: user._id,
      clerkUserId,
      role,
      content,
      tokenCount,
      metadata: metadata || {}
    });

    const savedMessage = await message.save();

    // Update conversation counts
    conversation.messageCount += 1;
    conversation.tokenCount += tokenCount;
    conversation.lastMessageAt = new Date();
    
    // Auto-generate title from first user message
    if (conversation.messageCount === 1 && role === 'user' && !conversation.title) {
      conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }
    
    await conversation.save();

    return { message: savedMessage, conversation };
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(
    conversationId: string,
    options: {
      limit?: number;
      skip?: number;
      includeSystem?: boolean;
    } = {}
  ): Promise<IMessage[]> {
    await connectDB();
    
    const query: any = { conversationId };
    if (!options.includeSystem) {
      query.role = { $ne: 'system' };
    }
    
    return Message.find(query)
      .sort({ createdAt: 1 })
      .limit(options.limit || 100)
      .skip(options.skip || 0);
  }

  /**
   * Update message content (for editing)
   */
  static async updateMessage(
    clerkUserId: string,
    messageId: string,
    content: string
  ): Promise<IMessage | null> {
    await connectDB();
    
    const message = await Message.findOne({ _id: messageId, clerkUserId });
    if (!message) return null;

    // Calculate new token count
    const newTokenCount = Math.ceil(content.length / 4);
    const tokenDiff = newTokenCount - message.tokenCount;

    message.content = content;
    message.tokenCount = newTokenCount;
    message.isEdited = true;
    message.editedAt = new Date();
    
    const updatedMessage = await message.save();

    // Update conversation token count
    if (tokenDiff !== 0) {
      const conversation = await Conversation.findById(message.conversationId);
      if (conversation) {
        conversation.tokenCount += tokenDiff;
        await conversation.save();
      }
    }

    return updatedMessage;
  }

  /**
   * Create an edited version of a message
   */
  static async createMessageEdit(
    clerkUserId: string,
    parentMessageId: string,
    newContent: string
  ): Promise<IMessage | null> {
    await connectDB();
    
    const parentMessage = await Message.findOne({ _id: parentMessageId, clerkUserId });
    if (!parentMessage) return null;

    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) throw new Error('User not found');

    const tokenCount = Math.ceil(newContent.length / 4);

    const editedMessage = new Message({
      conversationId: parentMessage.conversationId,
      userId: user._id,
      clerkUserId,
      role: parentMessage.role,
      content: newContent,
      tokenCount,
      parentMessageId: parentMessage._id,
      status: 'pending'
    });

    return editedMessage.save();
  }

  /**
   * Remove messages from a specific index
   */
  static async removeMessagesFromIndex(
    clerkUserId: string,
    conversationId: string,
    fromIndex: number
  ): Promise<{ deletedCount: number; conversation: IConversation | null }> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) {
      return { deletedCount: 0, conversation: null };
    }

    // Get messages to delete (from index onwards)
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .skip(fromIndex);

    if (messages.length === 0) {
      return { deletedCount: 0, conversation };
    }

    // Calculate tokens to subtract
    const tokensToSubtract = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // Delete the messages
    const deleteResult = await Message.deleteMany({
      _id: { $in: messages.map(m => m._id) }
    });

    // Update conversation counts
    conversation.messageCount -= deleteResult.deletedCount;
    conversation.tokenCount -= tokensToSubtract;
    conversation.lastMessageAt = new Date();
    
    await conversation.save();

    return { deletedCount: deleteResult.deletedCount, conversation };
  }

  /**
   * Update message status (for streaming)
   */
  static async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'done' | 'error' | 'streaming',
    error?: string
  ): Promise<IMessage | null> {
    await connectDB();
    
    const updateData: any = { status };
    if (status === 'error' && error) {
      updateData['metadata.error'] = error;
    }

    return Message.findByIdAndUpdate(messageId, updateData, { new: true });
  }
}

// Context Window Service
export class ContextWindowService {
  /**
   * Build context window for AI model
   */
  static async buildContext(
    clerkUserId: string,
    conversationId: string,
    maxTokens: number = 4000,
    includeSystemPrompt: boolean = true
  ): Promise<{
    messages: Array<{ role: string; content: string }>;
    totalTokens: number;
    truncated: boolean;
  }> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get all messages, most recent first
    const allMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const contextMessages: IMessage[] = [];
    let totalTokens = 0;

    // Add messages until we hit token limit (reverse chronological)
    for (const message of allMessages) {
      if (totalTokens + message.tokenCount > maxTokens) {
        break;
      }
      contextMessages.unshift(message); // Add to beginning
      totalTokens += message.tokenCount;
    }

    // Add system prompt if requested and exists
    if (includeSystemPrompt && conversation.systemPrompt) {
      const systemTokens = Math.ceil(conversation.systemPrompt.length / 4);
      if (totalTokens + systemTokens <= maxTokens) {
        contextMessages.unshift({
          role: 'system',
          content: conversation.systemPrompt
        } as any);
        totalTokens += systemTokens;
      }
    }

    // Check if we had to truncate messages
    const truncated = contextMessages.length < allMessages.length;

    // Format messages for AI model
    const formattedMessages = contextMessages.map((msg: IMessage) => ({
      role: msg.role,
      content: msg.content
    }));

    return {
      messages: formattedMessages,
      totalTokens,
      truncated
    };
  }

  /**
   * Estimate tokens for text
   */
  static estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// Usage Log Service
export class UsageLogService {
  /**
   * Log API usage
   */
  static async logUsage(
    clerkUserId: string,
    conversationId: string,
    messageId: string,
    model: string,
    operation: string,
    tokenUsage: {
      promptTokens: number;
      completionTokens?: number;
      totalTokens: number;
    },
    performance: {
      responseTimeMs: number;
      streamingTimeMs?: number;
      firstTokenTimeMs?: number;
    },
    metadata?: any
  ): Promise<IUsageLog> {
    await connectDB();
    
    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    const usageLog = new UsageLog({
      userId: user._id,
      clerkUserId,
      conversationId,
      messageId,
      aiModel: model,
      operation,
      tokenUsage,
      performance,
      metadata: metadata || {},
      billing: {
        planType: 'free', // Default to free plan
        quotaUsed: tokenUsage.totalTokens,
        quotaRemaining: 10000 - tokenUsage.totalTokens, // Example quota
        billingPeriod: this.getCurrentBillingPeriod()
      }
    });

    // Calculate cost
    usageLog.calculateCost(model, tokenUsage.totalTokens);

    return usageLog.save();
  }

  /**
   * Get current billing period
   */
  private static getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}

/**
 * Database health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await connectDB();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}