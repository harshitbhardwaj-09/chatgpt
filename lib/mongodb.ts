import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

// Track connection state
let isConnected = false

/**
 * Connect to MongoDB using modern async/await pattern
 * Handles reconnection automatically with Mongoose 8.x built-in connection pooling
 */
async function connectDB(): Promise<void> {
  // If already connected, return early
  if (isConnected && mongoose.connection.readyState === 1) {
    return
  }

  try {
    const options = {
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    }

    await mongoose.connect(MONGODB_URI, options)
    isConnected = true
    
    console.log('✅ MongoDB connected successfully')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    isConnected = false
    throw error
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect()
    isConnected = false
    console.log('🔌 MongoDB disconnected')
  }
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
  isConnected: boolean
  readyState: number
  readyStateName: string
} {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    readyStateName: states[mongoose.connection.readyState] || 'unknown'
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB')
  isConnected = true
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err)
  isConnected = false
})

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB')
  isConnected = false
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDB()
  process.exit(0)
})

export default connectDB
