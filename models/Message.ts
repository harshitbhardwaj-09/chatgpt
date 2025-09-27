import mongoose, { Document, Schema } from 'mongoose';

interface IFileAttachment {
  id: string;                               // Cloudinary public_id
  originalName: string;                     // Original file name
  cloudinaryUrl: string;                    // Cloudinary secure URL
  mimeType: string;                         // File MIME type
  size: number;                             // File size in bytes
  extractedText: string;                    // Text extracted from file
  metadata?: any;                           // Additional file metadata
  uploadedAt: Date;                         // When file was uploaded
}

interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;  // Reference to Conversation document
  userId: mongoose.Types.ObjectId;          // Reference to User document
  clerkUserId: string;                      // Clerk user ID for quick lookups
  role: 'user' | 'assistant' | 'system' | 'tool'; // Message role (added 'tool')
  content: string;                          // Message content
  contentType: string;                      // Content type (text, markdown, json, etc.)
  tokenCount: number;                       // Tokens used by this message
  status: 'pending' | 'done' | 'error' | 'streaming'; // Message status
  parentMessageId?: mongoose.Types.ObjectId; // For message editing/branching
  referencedMessageIds?: mongoose.Types.ObjectId[]; // Messages this message references
  isEdited: boolean;                        // Whether message was edited
  editedAt?: Date;                          // When message was last edited
  attachments?: IFileAttachment[];          // File attachments
  metadata: {
    model?: string;                         // AI model used for this specific message
    temperature?: number;                   // Generation temperature
    maxTokens?: number;                     // Max tokens for generation
    finishReason?: string;                  // How generation ended
    usage?: {                               // Token usage details
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    streamingDuration?: number;             // Time taken to stream (ms)
    error?: string;                         // Error message if status is 'error'
    hasAttachments?: boolean;               // Quick flag for attachment presence
  };
  reactions?: {                             // User reactions to message
    thumbsUp: boolean;
    thumbsDown: boolean;
    feedback?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
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
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 32000  // Maximum content length
  },
  contentType: {
    type: String,
    enum: ['text', 'markdown', 'json', 'html', 'code'],
    default: 'text',
    index: true
  },
  tokenCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'error', 'streaming'],
    default: 'done',
    index: true
  },
  parentMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    index: true,
    sparse: true
  },
  referencedMessageIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  isEdited: {
    type: Boolean,
    default: false,
    index: true
  },
  editedAt: {
    type: Date
  },
  metadata: {
    model: {
      type: String,
      enum: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro', 'gpt-4', 'gpt-3.5-turbo']
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      min: 1,
      max: 4000
    },
    finishReason: {
      type: String,
      enum: ['stop', 'length', 'content_filter', 'tool_calls', 'error']
    },
    usage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 }
    },
    streamingDuration: {
      type: Number,
      min: 0
    },
    error: {
      type: String,
      maxlength: 1000
    },
    hasAttachments: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  attachments: [{
    id: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255
    },
    cloudinaryUrl: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    extractedText: {
      type: String,
      default: ''
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: {
    thumbsUp: { type: Boolean, default: false },
    thumbsDown: { type: Boolean, default: false },
    feedback: { type: String, maxlength: 1000 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: 1 }); // Messages in conversation chronologically
MessageSchema.index({ clerkUserId: 1, role: 1 }); // User's messages by role
MessageSchema.index({ status: 1, createdAt: -1 }); // Pending/error messages
// MessageSchema.index({ parentMessageId: 1 }); // Already indexed in schema definition
MessageSchema.index({ 'metadata.usage.totalTokens': -1 }); // High token usage messages

// Pre-save middleware for edit tracking
MessageSchema.pre('save', function(this: IMessage, next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static methods for common operations
MessageSchema.statics.findByConversationId = function(conversationId: string, options: {
  limit?: number;
  skip?: number;
  includeSystem?: boolean;
} = {}) {
  const query: any = { conversationId };
  
  if (!options.includeSystem) {
    query.role = { $ne: 'system' };
  }
  
  return this.find(query)
    .sort({ createdAt: 1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

MessageSchema.statics.findForContextWindow = function(conversationId: string, maxTokens: number = 4000) {
  return this.find({ conversationId })
    .sort({ createdAt: -1 }) // Most recent first
    .limit(50) // Reasonable limit
    .then((messages: IMessage[]) => {
      const contextMessages: IMessage[] = [];
      let totalTokens = 0;
      
      // Add messages until we hit token limit (reverse chronological)
      for (const message of messages) {
        if (totalTokens + message.tokenCount > maxTokens) {
          break;
        }
        contextMessages.unshift(message); // Add to beginning
        totalTokens += message.tokenCount;
      }
      
      return { messages: contextMessages, totalTokens };
    });
};

MessageSchema.statics.findEditChain = function(parentMessageId: string) {
  return this.find({ parentMessageId }).sort({ createdAt: 1 });
};

// Instance methods
MessageSchema.methods.markAsError = function(errorMessage: string) {
  this.status = 'error';
  this.metadata.error = errorMessage;
  return this.save();
};

MessageSchema.methods.markAsStreaming = function() {
  this.status = 'streaming';
  return this.save();
};

MessageSchema.methods.markAsDone = function() {
  this.status = 'done';
  return this.save();
};

MessageSchema.methods.addReaction = function(type: 'thumbsUp' | 'thumbsDown', feedback?: string) {
  if (!this.reactions) {
    this.reactions = { thumbsUp: false, thumbsDown: false };
  }
  
  // Toggle the reaction
  this.reactions[type] = !this.reactions[type];
  
  // Clear opposite reaction
  if (type === 'thumbsUp' && this.reactions.thumbsUp) {
    this.reactions.thumbsDown = false;
  } else if (type === 'thumbsDown' && this.reactions.thumbsDown) {
    this.reactions.thumbsUp = false;
  }
  
  if (feedback) {
    this.reactions.feedback = feedback;
  }
  
  return this.save();
};

MessageSchema.methods.createEdit = function(newContent: string, userId: mongoose.Types.ObjectId, clerkUserId: string) {
  const EditedMessage = this.constructor as any;
  
  return new EditedMessage({
    conversationId: this.conversationId,
    userId,
    clerkUserId,
    role: this.role,
    content: newContent,
    parentMessageId: this._id,
    tokenCount: 0, // Will be calculated
    status: 'pending'
  });
};

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export type { IMessage };