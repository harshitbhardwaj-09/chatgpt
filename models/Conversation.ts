import mongoose, { Document, Schema } from 'mongoose';

interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;    // Reference to User document
  clerkUserId: string;                // Clerk user ID for quick lookups
  title?: string;                     // Auto-generated from first message or user-provided
  messageCount: number;               // Total messages in conversation
  tokenCount: number;                 // Sum of tokens for context window management
  isArchived: boolean;                // Soft delete / hide functionality
  isPinned: boolean;                  // User can pin important conversations
  lastMessageAt: Date;                // Last message timestamp for sorting
  contextWindow: number;              // Token limit for this conversation (default 4000)
  aiModel: string;                    // AI model used (e.g., "gemini-2.5-flash")
  systemPrompt?: string;              // Optional system prompt for conversation
  metadata: {
    source?: string;                  // How conversation was created (web, mobile, api)
    tags?: string[];                  // User-defined tags
    summary?: string;                 // AI-generated summary for long conversations
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  clerkUserId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  messageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  tokenCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  contextWindow: {
    type: Number,
    default: 4000,
    min: 1000,
    max: 32000
  },
  aiModel: {
    type: String,
    default: 'gemini-2.5-flash',
    enum: ['gemini-2.5-flash', 'gemini-pro', 'gpt-4', 'gpt-3.5-turbo']
  },
  systemPrompt: {
    type: String,
    maxlength: 1000
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    tags: [{
      type: String,
      maxlength: 50
    }],
    summary: {
      type: String,
      maxlength: 500
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
ConversationSchema.index({ clerkUserId: 1, lastMessageAt: -1 }); // List conversations by recency
ConversationSchema.index({ clerkUserId: 1, isPinned: -1, lastMessageAt: -1 }); // Pinned conversations first
ConversationSchema.index({ clerkUserId: 1, isArchived: 1, lastMessageAt: -1 }); // Archived conversations
ConversationSchema.index({ tokenCount: 1 }); // For context window management
ConversationSchema.index({ 'metadata.tags': 1 }); // Tag-based searches

// Pre-save middleware to auto-generate title from first message
ConversationSchema.pre('save', function(this: IConversation, next) {
  if (this.isNew && !this.title && this.messageCount === 0) {
    this.title = 'New Conversation';
  }
  next();
});

// Static methods for common operations
ConversationSchema.statics.findByClerkUserId = function(clerkUserId: string, options: {
  includeArchived?: boolean;
  limit?: number;
  skip?: number;
} = {}) {
  const query: any = { clerkUserId };
  
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ isPinned: -1, lastMessageAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

ConversationSchema.statics.findByClerkUserIdAndId = function(clerkUserId: string, conversationId: string) {
  return this.findOne({ _id: conversationId, clerkUserId });
};

// Instance methods
ConversationSchema.methods.incrementCounts = function(messageTokens: number) {
  this.messageCount += 1;
  this.tokenCount += messageTokens;
  this.lastMessageAt = new Date();
  return this.save();
};

ConversationSchema.methods.updateTitle = function(newTitle: string) {
  this.title = newTitle.trim().substring(0, 200);
  return this.save();
};

ConversationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

ConversationSchema.methods.unarchive = function() {
  this.isArchived = false;
  return this.save();
};

ConversationSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export type { IConversation };

