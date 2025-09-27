import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  clerkId: string;          // Clerk user ID for authentication mapping
  email: string;            // Primary identifier from Clerk
  name?: string;            // Optional display name from Clerk
  avatar?: string;          // Optional avatar URL from Clerk
  isActive: boolean;        // Account status
  lastActiveAt: Date;       // Last activity timestamp
  createdAt: Date;
  updatedAt: Date;
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
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
UserSchema.index({ clerkId: 1, email: 1 });
UserSchema.index({ isActive: 1, lastActiveAt: -1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export type { IUser };

