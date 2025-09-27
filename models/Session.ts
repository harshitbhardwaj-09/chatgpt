import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  clerkSessionId: string
  clerkUserId: string
  windowId?: string // Unique identifier for browser window/tab
  ip?: string
  userAgent?: string
  deviceInfo?: {
    browser?: string
    os?: string
    device?: string
    isMobile?: boolean
  }
  location?: {
    country?: string
    city?: string
    timezone?: string
  }
  metadata?: Record<string, any>
  isActive: boolean
  createdAt: Date
  lastActiveAt: Date
  expiresAt?: Date
}

const SessionSchema = new Schema<ISession>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  clerkSessionId: { 
    type: String, 
    required: true,
    index: true
  },
  clerkUserId: {
    type: String,
    required: true,
    index: true
  },
  windowId: {
    type: String,
    index: true,
    sparse: true // Allow multiple null values
  },
  ip: { 
    type: String,
    maxlength: 45 // IPv6 max length
  },
  userAgent: { 
    type: String,
    maxlength: 500
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    isMobile: { type: Boolean, default: false }
  },
  location: {
    country: String,
    city: String,
    timezone: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  lastActiveAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: false // We handle timestamps manually
})

// TTL Index: Expire sessions older than 30 days based on lastActiveAt
SessionSchema.index(
  { lastActiveAt: 1 }, 
  { 
    expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days
    name: 'session_ttl_index'
  }
)

// Compound indexes for efficient queries
SessionSchema.index({ userId: 1, isActive: 1, lastActiveAt: -1 })
SessionSchema.index({ clerkUserId: 1, isActive: 1 })
SessionSchema.index({ windowId: 1, isActive: 1 })

// Instance methods
SessionSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date()
  return this.save()
}

SessionSchema.methods.deactivate = function() {
  this.isActive = false
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
  return this.save()
}

// Static methods
SessionSchema.statics.createSession = async function(
  userId: mongoose.Types.ObjectId,
  clerkSessionId: string,
  clerkUserId: string,
  sessionData: {
    windowId?: string
    ip?: string
    userAgent?: string
    deviceInfo?: any
    location?: any
    metadata?: any
  } = {}
) {
  const session = new this({
    userId,
    clerkSessionId,
    clerkUserId,
    ...sessionData,
    isActive: true,
    createdAt: new Date(),
    lastActiveAt: new Date()
  })
  
  return session.save()
}

SessionSchema.statics.findActiveByUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({ 
    userId, 
    isActive: true 
  }).sort({ lastActiveAt: -1 })
}

SessionSchema.statics.findByWindowId = function(windowId: string) {
  return this.findOne({ 
    windowId, 
    isActive: true 
  })
}

SessionSchema.statics.deactivateOldSessions = async function(
  userId: mongoose.Types.ObjectId, 
  keepLatest: number = 5
) {
  const sessions = await this.find({ 
    userId, 
    isActive: true 
  }).sort({ lastActiveAt: -1 })
  
  if (sessions.length > keepLatest) {
    const sessionsToDeactivate = sessions.slice(keepLatest)
    const sessionIds = sessionsToDeactivate.map((s: ISession) => s._id)
    
    return this.updateMany(
      { _id: { $in: sessionIds } },
      { 
        isActive: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    )
  }
  
  return null
}

// Pre-save middleware
SessionSchema.pre('save', function(next) {
  if (this.isModified('lastActiveAt') || this.isNew) {
    // Update expiresAt based on lastActiveAt for TTL
    this.expiresAt = new Date(this.lastActiveAt.getTime() + (30 * 24 * 60 * 60 * 1000))
  }
  next()
})

const Session = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema)

export default Session
