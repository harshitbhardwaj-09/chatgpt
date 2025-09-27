import { Schema, model, models, Document } from 'mongoose'

export interface IUser extends Document {
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  firstName: { 
    type: String, 
    trim: true 
  },
  lastName: { 
    type: String, 
    trim: true 
  },
  username: { 
    type: String, 
    trim: true 
  },
  avatar: { 
    type: String 
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v
      return ret
    }
  }
})

// Indexes for better performance
UserSchema.index({ clerkId: 1 })
UserSchema.index({ email: 1 })

export default models.User || model<IUser>('User', UserSchema)

