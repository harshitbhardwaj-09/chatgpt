import { Schema, model, models, Document, Types } from 'mongoose'

export type MessageRole = 'system' | 'user' | 'assistant'

export interface IMessage {
  _id?: Types.ObjectId
  role: MessageRole
  content: string
  createdAt: Date
}

export interface IConversation extends Document {
  user: Types.ObjectId
  clerkUserId: string
  title: string
  messages: IMessage[]
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
}

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['system', 'user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true,
  timestamps: false
})

const ConversationSchema = new Schema<IConversation>({
  user: {
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
    required: true,
    trim: true,
    maxlength: 100,
    default: 'New Chat'
  },
  messages: [MessageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v
      return ret
    }
  }
})

// Indexes for better performance
ConversationSchema.index({ user: 1, createdAt: -1 })
ConversationSchema.index({ clerkUserId: 1, createdAt: -1 })
ConversationSchema.index({ lastMessageAt: -1 })

// Update lastMessageAt when messages are added
ConversationSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = new Date()
  }
  next()
})

// Static methods for common operations
ConversationSchema.statics.findByClerkUserId = function(clerkUserId: string) {
  return this.find({ clerkUserId }).sort({ lastMessageAt: -1 })
}

ConversationSchema.statics.findByClerkUserIdAndId = function(clerkUserId: string, conversationId: string) {
  return this.findOne({ _id: conversationId, clerkUserId })
}

// Instance methods
ConversationSchema.methods.addMessage = function(role: MessageRole, content: string) {
  this.messages.push({
    role,
    content,
    createdAt: new Date()
  })
  this.lastMessageAt = new Date()
  return this.save()
}

ConversationSchema.methods.getMessagesForOpenAI = function() {
  return this.messages.map((msg: IMessage) => ({
    role: msg.role,
    content: msg.content
  }))
}

ConversationSchema.methods.updateTitle = function(newTitle: string) {
  this.title = newTitle.trim()
  return this.save()
}

export default models.Conversation || model<IConversation>('Conversation', ConversationSchema)

