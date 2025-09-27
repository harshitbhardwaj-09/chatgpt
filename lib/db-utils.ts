import { auth, clerkClient } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import connectDB from './mongodb';
import User, { IUser } from '../models/User';
import Conversation, { IConversation } from '../models/Conversation';
import Message, { IMessage } from '../models/Message';
import UsageLog, { IUsageLog } from '../models/UsageLog';
import Session, { ISession } from '../models/Session';
import { memoryService } from './memory-service';

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
  static async findOrCreateUser(clerkId: string, email: string, name?: string, avatar?: string): Promise<IUser> {
    try {
      await connectDB();
      
      let user = await User.findOne({ clerkId });

      if (!user) {
        // Get Clerk user data for profile
        const client = await clerkClient();
        const clerkUser = clerkId ? await client.users.getUser(clerkId) : null;
        
        user = new User({
          clerkId,
          email,
          name: name || clerkUser?.firstName + ' ' + clerkUser?.lastName || 'Anonymous',
          avatar: avatar || clerkUser?.imageUrl || undefined,
          conversations: [],
          lastActiveAt: new Date(),
        });
        await user.save();
      } else {
        // Update existing user with Clerk data if available
        const client = await clerkClient();
        const clerkUser = clerkId ? await client.users.getUser(clerkId) : null;
        const updates: Partial<IUser> = {};

        if (user.name !== (name || clerkUser?.firstName + ' ' + clerkUser?.lastName)) {
          updates.name = name || clerkUser?.firstName + ' ' + clerkUser?.lastName || user.name;
        }
        
        if (user.avatar !== clerkUser?.imageUrl) {
          updates.avatar = clerkUser?.imageUrl || undefined;
        }
        
        if (Object.keys(updates).length > 0) {
          updates.lastActiveAt = new Date();
          Object.assign(user, updates);
          await user.save();
        }
      }

      return user;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
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
   * Create a new conversation with session support
   */
  static async createConversation(
    clerkUserId: string,
    title?: string,
    systemPrompt?: string,
    model: string = 'gemini-1.5-flash',
    sessionData?: {
      windowId?: string;
      sessionId?: string;
      source?: string;
      windowInfo?: any;
    }
  ): Promise<IConversation> {
    await connectDB();
    
    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get or create session if windowId is provided
    let sessionId: string | undefined;
    if (sessionData?.windowId) {
      try {
        const session = await SessionService.getSessionByWindowId(sessionData.windowId);
        if (session) {
          sessionId = session._id.toString();
        }
      } catch (error) {
        console.warn('Failed to get session for conversation:', error);
      }
    }

    const conversation = new Conversation({
      userId: user._id,
      clerkUserId,
      sessionId: sessionId ? new mongoose.Types.ObjectId(sessionId) : undefined,
      windowId: sessionData?.windowId,
      title: title || 'New Conversation',
      systemPrompt,
      aiModel: model,
      metadata: {
        source: sessionData?.source || 'web',
        windowInfo: sessionData?.windowInfo
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
    try {
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
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
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

  static async searchConversations(
    clerkUserId: string,
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    conversations: IConversation[];
    total: number;
    hasMore: boolean;
  }> {
    await connectDB();

    const searchRegex = new RegExp(query.split(' ').map(term => `(?=.*${term})`).join(''), 'i');
    
    // Search in conversation titles
    const titleMatches = await Conversation.find({
      clerkUserId,
      title: { $regex: searchRegex }
    })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('userId', 'name email');

    // Search in message content for conversations not already found by title
    const titleMatchIds = titleMatches.map(c => c._id.toString());
    
    const messageMatches = await Message.aggregate([
      {
        $match: {
          content: { $regex: searchRegex },
          conversationId: { $nin: titleMatchIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessageAt: { $max: '$createdAt' },
          matchCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'conversations',
          localField: '_id',
          foreignField: '_id',
          as: 'conversation'
        }
      },
      {
        $unwind: '$conversation'
      },
      {
        $match: {
          'conversation.clerkUserId': clerkUserId
        }
      },
      {
        $sort: { matchCount: -1, lastMessageAt: -1 }
      },
      {
        $limit: limit - titleMatches.length
      },
      {
        $skip: Math.max(0, offset - titleMatches.length)
      }
    ]);

    const messageMatchConversations = await Conversation.find({
      _id: { $in: messageMatches.map(m => m._id) }
    }).populate('userId', 'name email');

    // Combine results, prioritizing title matches
    const allConversations = [
      ...titleMatches,
      ...messageMatchConversations
    ];

    // Get total count for pagination
    const totalTitleMatches = await Conversation.countDocuments({
      clerkUserId,
      title: { $regex: searchRegex }
    });

    const totalMessageMatches = await Message.aggregate([
      {
        $match: {
          content: { $regex: searchRegex }
        }
      },
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation'
        }
      },
      {
        $unwind: '$conversation'
      },
      {
        $match: {
          'conversation.clerkUserId': clerkUserId,
          'conversation._id': { $nin: titleMatchIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$conversationId'
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalTitleMatches + (totalMessageMatches[0]?.total || 0);
    const hasMore = offset + limit < total;

    return {
      conversations: allConversations,
      total,
      hasMore
    };
  }

  static async advancedSearch(
    clerkUserId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'relevance' | 'date' | 'title';
      dateRange?: {
        start?: Date;
        end?: Date;
      };
      aiModel?: string;
      hasSystemPrompt?: boolean;
    } = {}
  ): Promise<{
    conversations: IConversation[];
    total: number;
    hasMore: boolean;
  }> {
    await connectDB();

    const {
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      dateRange,
      aiModel,
      hasSystemPrompt
    } = options;

    // Build search criteria
    const searchCriteria: any = {
      clerkUserId
    };

    if (dateRange) {
      searchCriteria.createdAt = {};
      if (dateRange.start) searchCriteria.createdAt.$gte = dateRange.start;
      if (dateRange.end) searchCriteria.createdAt.$lte = dateRange.end;
    }

    if (aiModel) {
      searchCriteria.aiModel = aiModel;
    }

    if (hasSystemPrompt !== undefined) {
      searchCriteria.systemPrompt = hasSystemPrompt 
        ? { $exists: true, $nin: [null, ''] }
        : { $in: [null, ''] };
    }

    const searchRegex = new RegExp(query.split(' ').map(term => `(?=.*${term})`).join(''), 'i');

    // Search in titles and content
    const titleSearch = {
      ...searchCriteria,
      title: { $regex: searchRegex }
    };

    let sortCriteria: any = {};
    switch (sortBy) {
      case 'date':
        sortCriteria = { lastMessageAt: -1 };
        break;
      case 'title':
        sortCriteria = { title: 1 };
        break;
      case 'relevance':
      default:
        sortCriteria = { lastMessageAt: -1 }; // Default to date for now
        break;
    }

    const titleMatches = await Conversation.find(titleSearch)
      .sort(sortCriteria)
      .limit(limit)
      .skip(offset)
      .populate('userId', 'name email');

    // For content search in messages
    const titleMatchIds = titleMatches.map(c => c._id.toString());
    
    const messageSearchPipeline: any[] = [
      {
        $match: {
          content: { $regex: searchRegex }
        }
      },
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation'
        }
      },
      {
        $unwind: '$conversation'
      },
      {
        $match: {
          'conversation.clerkUserId': clerkUserId,
          'conversation._id': { $nin: titleMatchIds.map(id => new mongoose.Types.ObjectId(id)) },
          ...(dateRange && {
            'conversation.createdAt': {
              ...(dateRange.start && { $gte: dateRange.start }),
              ...(dateRange.end && { $lte: dateRange.end })
            }
          }),
          ...(aiModel && { 'conversation.aiModel': aiModel }),
          ...(hasSystemPrompt !== undefined && {
            'conversation.systemPrompt': hasSystemPrompt 
              ? { $exists: true, $nin: [null, ''] }
              : { $in: [null, ''] }
          })
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessageAt: { $max: '$createdAt' },
          matchCount: { $sum: 1 },
          conversation: { $first: '$conversation' }
        }
      },
      {
        $sort: { matchCount: -1, lastMessageAt: -1 }
      },
      {
        $limit: limit - titleMatches.length
      },
      {
        $skip: Math.max(0, offset - titleMatches.length)
      }
    ];

    const messageMatches = await Message.aggregate(messageSearchPipeline);
    
    const messageMatchConversations = await Conversation.find({
      _id: { $in: messageMatches.map(m => m._id) }
    }).populate('userId', 'name email');

    const allConversations = [
      ...titleMatches,
      ...messageMatchConversations
    ];

    // Get total count
    const totalTitleMatches = await Conversation.countDocuments(titleSearch);
    
    const totalMessageMatchesPipeline: any[] = [
      ...messageSearchPipeline.slice(0, -3), // Remove limit, skip, sort
      {
        $group: {
          _id: '$conversationId'
        }
      },
      {
        $count: 'total'
      }
    ];

    const totalMessageMatches = await Message.aggregate(totalMessageMatchesPipeline);
    const total = totalTitleMatches + (totalMessageMatches[0]?.total || 0);
    const hasMore = offset + limit < total;

    return {
      conversations: allConversations,
      total,
      hasMore
    };
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

    // Process conversation for memory if we have both user and assistant messages
    if (role === 'assistant' && conversation.messageCount >= 2) {
      // Get recent messages for memory processing
      const recentMessages = await Message.find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(4) // Last 4 messages for context
        .sort({ createdAt: 1 }); // Back to chronological order

      if (recentMessages.length >= 2) {
        const memoryMessages = recentMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

        // Process in background without blocking the response
        memoryService.processConversation(clerkUserId, memoryMessages)
          .catch(error => console.error('Background memory processing failed:', error));
      }
    }

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
   * Build context window with optimized token-based selection
   * Following the pseudo-code pattern for efficient context building
   */
  static async buildContext(
    clerkUserId: string,
    conversationId: string,
    tokenBudget: number = 4000,
    includeSystemPrompt: boolean = true,
    currentQuery?: string
  ): Promise<{
    messages: Array<{ role: string; content: string }>;
    totalTokens: number;
    truncated: boolean;
    memoryContext?: string[];
    memoryUsed: boolean;
  }> {
    await connectDB();
    
    const conversation = await Conversation.findOne({ _id: conversationId, clerkUserId });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Prepare system prompts first
    const systemPrompts: Array<{ role: string; content: string; tokenCount: number }> = [];
    let systemTokensUsed = 0;

    // Add system prompt if requested and exists
    if (includeSystemPrompt && conversation.systemPrompt) {
      const systemTokens = this.estimateTokens(conversation.systemPrompt);
      systemPrompts.push({
        role: 'system',
        content: conversation.systemPrompt,
        tokenCount: systemTokens
      });
      systemTokensUsed += systemTokens;
    }

    // Reserve tokens for memory context if memory service is available
    let memoryContext: string[] = [];
    let memoryUsed = false;
    let memoryTokensUsed = 0;

    if (memoryService.isAvailable() && currentQuery) {
      try {
        const memories = await memoryService.searchMemories(clerkUserId, currentQuery, 3);
        if (memories.length > 0) {
          memoryContext = memories.map(m => m.memory);
          
          // Calculate memory tokens and add as system message
          const memoryContent = `Previous conversation context from memory:\n${memoryContext.map((memory, index) => `${index + 1}. ${memory}`).join('\n')}\n\nPlease use this context to provide more personalized and relevant responses.`;
          const memoryTokens = this.estimateTokens(memoryContent);
          
          // Reserve up to 20% of token budget for memory, but cap at 800 tokens
          const maxMemoryTokens = Math.min(800, tokenBudget * 0.2);
          
          if (memoryTokens <= maxMemoryTokens) {
            systemPrompts.push({
              role: 'system',
              content: memoryContent,
              tokenCount: memoryTokens
            });
            memoryTokensUsed = memoryTokens;
            memoryUsed = true;
            console.log(`📝 Added ${memories.length} memories to context (${memoryTokens} tokens)`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch memory context:', error);
      }
    }

    // Calculate remaining token budget for messages
    const remainingBudget = tokenBudget - systemTokensUsed - memoryTokensUsed;

    // Get messages cursor - most recent first for efficient selection
    const messagesCursor = Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .cursor();

    const selectedMessages: IMessage[] = [];
    let tokensSum = 0;
    let totalMessagesChecked = 0;

    // Iterate through messages until we hit token budget
    for (let message = await messagesCursor.next(); message != null; message = await messagesCursor.next()) {
      totalMessagesChecked++;
      
      const messageTokens = this.getMessageTokenCount(message);
      
      // Check if adding this message would exceed budget
      if (tokensSum + messageTokens > remainingBudget) {
        console.log(`✂️ Context limit reached: selected ${selectedMessages.length}/${totalMessagesChecked} messages`);
        break;
      }
      
      selectedMessages.push(message);
      tokensSum += messageTokens;
      
      // Safety limit to prevent infinite loops
      if (selectedMessages.length >= 100) {
        console.log(`⚠️ Hit safety limit: selected 100 messages`);
        break;
      }
    }

    // Close cursor
    await messagesCursor.close();

    // Reverse to chronological order (oldest first)
    selectedMessages.reverse();

    // Calculate final totals
    const totalTokens = systemTokensUsed + memoryTokensUsed + tokensSum;
    const truncated = selectedMessages.length < totalMessagesChecked;

    // Format messages for AI model: [...systemPrompts, ...selectedMessages]
    const formattedMessages = [
      ...systemPrompts,
      ...selectedMessages.map((msg: IMessage) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log(`🎯 Context built: ${formattedMessages.length} messages, ${totalTokens}/${tokenBudget} tokens${truncated ? ' (truncated)' : ''}`);

    return {
      messages: formattedMessages,
      totalTokens,
      truncated,
      memoryContext: memoryUsed ? memoryContext : undefined,
      memoryUsed
    };
  }

  /**
   * Build enhanced context with memory integration using memory service directly
   */
  static async buildEnhancedContext(
    clerkUserId: string,
    conversationId: string,
    maxTokens: number = 4000,
    currentQuery?: string
  ): Promise<{
    messages: Array<{ role: string; content: string }>;
    totalTokens: number;
    truncated: boolean;
    memoryContext?: string[];
    memoryUsed: boolean;
  }> {
    await connectDB();
    
    // Get conversation messages
    const allMessages = await Message.find({ conversationId })
      .sort({ createdAt: 1 }) // Chronological order for memory service
      .limit(100);

    // Convert to memory service format
    const memoryMessages = allMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Use memory service for context building
    const contextWindow = await memoryService.buildContextWindow(
      clerkUserId,
      memoryMessages,
      currentQuery
    );

    return {
      messages: contextWindow.messages,
      totalTokens: contextWindow.totalTokens,
      truncated: contextWindow.trimmed,
      memoryContext: contextWindow.memoryContext,
      memoryUsed: !!contextWindow.memoryContext && contextWindow.memoryContext.length > 0
    };
  }

  /**
   * Estimate tokens for text with improved accuracy
   */
  static estimateTokens(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    // More accurate estimation based on OpenAI's guidelines:
    // - 1 token ≈ 4 characters for English text
    // - 1 token ≈ ¾ words
    // - Special characters and punctuation count differently
    
    const chars = text.length;
    const words = text.split(/\s+/).length;
    
    // Use the higher of the two estimates for safety
    const charBasedTokens = Math.ceil(chars / 4);
    const wordBasedTokens = Math.ceil(words / 0.75);
    
    return Math.max(charBasedTokens, wordBasedTokens);
  }

  /**
   * Get accurate token count for a message
   */
  static getMessageTokenCount(message: IMessage): number {
    // Use stored token count if available, otherwise estimate
    return message.tokenCount || this.estimateTokens(message.content);
  }
}

// Session Service
export class SessionService {
  /**
   * Create or update session for user
   */
  static async createOrUpdateSession(
    clerkUserId: string,
    clerkSessionId: string,
    sessionData: {
      windowId?: string;
      ip?: string;
      userAgent?: string;
      deviceInfo?: any;
      location?: any;
      metadata?: any;
    } = {}
  ): Promise<ISession> {
    await connectDB();
    
    const user = await UserService.getByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if session already exists
    let session = await Session.findOne({ 
      clerkSessionId, 
      clerkUserId,
      isActive: true 
    });

    if (session) {
      // Update existing session
      session.lastActiveAt = new Date();
      if (sessionData.windowId && session.windowId !== sessionData.windowId) {
        session.windowId = sessionData.windowId;
      }
      if (sessionData.ip) session.ip = sessionData.ip;
      if (sessionData.userAgent) session.userAgent = sessionData.userAgent;
      if (sessionData.deviceInfo) session.deviceInfo = sessionData.deviceInfo;
      if (sessionData.location) session.location = sessionData.location;
      if (sessionData.metadata) {
        session.metadata = { ...session.metadata, ...sessionData.metadata };
      }
      
      return session.save();
    } else {
      // Create new session
      return Session.create({
        userId: user._id,
        clerkUserId,
        clerkSessionId,
        ...sessionData,
        isActive: true,
        createdAt: new Date(),
        lastActiveAt: new Date()
      });
    }
  }

  /**
   * Get active session by window ID
   */
  static async getSessionByWindowId(windowId: string): Promise<ISession | null> {
    await connectDB();
    return Session.findOne({ windowId, isActive: true });
  }

  /**
   * Get all active sessions for user
   */
  static async getUserActiveSessions(clerkUserId: string): Promise<ISession[]> {
    await connectDB();
    return Session.find({ clerkUserId, isActive: true })
      .sort({ lastActiveAt: -1 })
      .limit(10);
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<ISession | null> {
    await connectDB();
    
    const updateData: any = { lastActiveAt: new Date() };
    if (metadata) {
      updateData.$set = { 'metadata': metadata };
    }

    return Session.findByIdAndUpdate(sessionId, updateData, { new: true });
  }

  /**
   * Deactivate session
   */
  static async deactivateSession(sessionId: string): Promise<boolean> {
    await connectDB();
    
    const result = await Session.findByIdAndUpdate(
      sessionId,
      { 
        isActive: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    );

    return !!result;
  }

  /**
   * Cleanup old sessions for user (keep only latest N)
   */
  static async cleanupOldSessions(
    clerkUserId: string, 
    keepLatest: number = 5
  ): Promise<number> {
    await connectDB();
    
    const sessions = await Session.find({ clerkUserId, isActive: true })
      .sort({ lastActiveAt: -1 });

    if (sessions.length > keepLatest) {
      const sessionsToDeactivate = sessions.slice(keepLatest);
      const sessionIds = sessionsToDeactivate.map(s => s._id);
      
      const result = await Session.updateMany(
        { _id: { $in: sessionIds } },
        { 
          isActive: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      );

      return result.modifiedCount;
    }

    return 0;
  }

  /**
   * Get session statistics for user
   */
  static async getSessionStats(clerkUserId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    lastActiveAt?: Date;
    averageSessionDuration?: number;
  }> {
    await connectDB();
    
    const [total, active, lastSession] = await Promise.all([
      Session.countDocuments({ clerkUserId }),
      Session.countDocuments({ clerkUserId, isActive: true }),
      Session.findOne({ clerkUserId }).sort({ lastActiveAt: -1 })
    ]);

    // Calculate average session duration (simplified)
    const recentSessions = await Session.find({ 
      clerkUserId, 
      isActive: false 
    })
      .sort({ createdAt: -1 })
      .limit(10);

    let averageSessionDuration: number | undefined;
    if (recentSessions.length > 0) {
      const totalDuration = recentSessions.reduce((sum, session) => {
        const duration = session.lastActiveAt.getTime() - session.createdAt.getTime();
        return sum + duration;
      }, 0);
      averageSessionDuration = totalDuration / recentSessions.length;
    }

    return {
      totalSessions: total,
      activeSessions: active,
      lastActiveAt: lastSession?.lastActiveAt,
      averageSessionDuration
    };
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