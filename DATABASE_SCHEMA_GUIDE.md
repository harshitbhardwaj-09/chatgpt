# 🗄️ Database Schema Guide - Enhanced ChatGPT Clone

Complete database schema implementation with session management, context window optimization, and memory integration.

## 📊 Schema Overview

### 🔗 **Relationships**
```
User (1) ←→ (N) Session
User (1) ←→ (N) Conversation  
User (1) ←→ (N) Message
User (1) ←→ (N) UsageLog

Session (1) ←→ (N) Conversation
Conversation (1) ←→ (N) Message

Message (1) ←→ (N) Message (references/edits)
```

## 📋 **Schema Definitions**

### 👤 **User Model** (`models/User.ts`)
```typescript
interface IUser {
  clerkId: string;              // Clerk authentication ID
  email: string;                // Primary email
  name?: string;                // Display name
  avatar?: string;              // Profile image URL
  isActive: boolean;            // Account status
  lastActiveAt: Date;           // Last activity timestamp
  conversations: ObjectId[];    // Reference to conversations
  preferences: {                // User preferences
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  metadata: Mixed;              // Additional user data
}
```

### 🔐 **Session Model** (`models/Session.ts`) - **NEW**
```typescript
interface ISession {
  userId: ObjectId;             // Reference to User
  clerkSessionId: string;       // Clerk session identifier
  clerkUserId: string;          // Clerk user ID for quick lookup
  windowId?: string;            // Browser window/tab identifier
  ip?: string;                  // IP address
  userAgent?: string;           // Browser user agent
  deviceInfo?: {                // Device information
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  };
  location?: {                  // Location data
    country?: string;
    city?: string;
    timezone?: string;
  };
  metadata: Record<string, any>; // Additional session data
  isActive: boolean;            // Session status
  createdAt: Date;              // Session start time
  lastActiveAt: Date;           // Last activity (TTL index)
  expiresAt?: Date;             // Manual expiration
}

// TTL Index: Expires after 30 days of inactivity
SessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 2592000 });
```

### 💬 **Conversation Model** (`models/Conversation.ts`) - **ENHANCED**
```typescript
interface IConversation {
  userId: ObjectId;             // Reference to User
  clerkUserId: string;          // Clerk user ID for quick lookup
  sessionId?: ObjectId;         // Reference to Session (NEW)
  windowId?: string;            // Browser window identifier (NEW)
  title?: string;               // Auto-generated or user-defined
  messageCount: number;         // Total messages count
  tokenCount: number;           // Sum of all message tokens
  isArchived: boolean;          // Soft delete flag
  isPinned: boolean;            // User pinned status
  lastMessageAt: Date;          // Last message timestamp
  contextWindow: number;        // Token limit (default: 4000)
  aiModel: string;              // AI model used
  systemPrompt?: string;        // System prompt
  metadata: {
    source?: string;            // Creation source (web, mobile, api)
    tags?: string[];            // User-defined tags
    summary?: string;           // AI-generated summary
    windowInfo?: {              // Window-specific metadata (NEW)
      userAgent?: string;
      screenResolution?: string;
      timezone?: string;
    };
  };
}

// Key Indexes
ConversationSchema.index({ clerkUserId: 1, lastMessageAt: -1 });
ConversationSchema.index({ windowId: 1, isActive: 1 });
ConversationSchema.index({ sessionId: 1 });
```

### 📝 **Message Model** (`models/Message.ts`) - **ENHANCED**
```typescript
interface IMessage {
  conversationId: ObjectId;     // Reference to Conversation
  userId: ObjectId;             // Reference to User
  clerkUserId: string;          // Clerk user ID for quick lookup
  role: 'user' | 'assistant' | 'system' | 'tool'; // Message role (tool added)
  content: string;              // Message content
  contentType: string;          // Content type (text, markdown, json, etc.) (NEW)
  tokenCount: number;           // Tokens used by this message
  status: 'pending' | 'done' | 'error' | 'streaming'; // Message status
  parentMessageId?: ObjectId;   // For message editing/branching
  referencedMessageIds?: ObjectId[]; // Messages this message references (NEW)
  isEdited: boolean;            // Edit flag
  editedAt?: Date;              // Edit timestamp
  attachments?: IFileAttachment[]; // File attachments
  metadata: {
    model?: string;             // AI model used
    temperature?: number;       // Generation temperature
    maxTokens?: number;         // Max tokens for generation
    finishReason?: string;      // Generation finish reason
    usage?: {                   // Token usage details
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    streamingDuration?: number; // Streaming time (ms)
    error?: string;             // Error message
    hasAttachments?: boolean;   // Quick attachment flag
  };
  reactions?: {                 // User reactions
    thumbsUp: boolean;
    thumbsDown: boolean;
    feedback?: string;
  };
}

// Key Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ referencedMessageIds: 1 });
MessageSchema.index({ contentType: 1 });
```

### 📊 **UsageLog Model** (`models/UsageLog.ts`) - **EXISTING**
```typescript
interface IUsageLog {
  userId: ObjectId;             // Reference to User
  clerkUserId: string;          // Clerk user ID
  conversationId: ObjectId;     // Reference to Conversation
  messageId: ObjectId;          // Reference to Message
  aiModel: string;              // AI model used
  operation: string;            // Operation type
  tokenUsage: {                 // Token usage
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  performance: {                // Performance metrics
    responseTimeMs: number;
    streamingTimeMs?: number;
    firstTokenTimeMs?: number;
  };
  billing: {                    // Billing information
    planType: string;
    quotaUsed: number;
    quotaRemaining: number;
    billingPeriod: string;
  };
  metadata: Record<string, any>; // Additional metadata
}
```

## 🚀 **Service Classes**

### 🔐 **SessionService** - **NEW**
```typescript
class SessionService {
  // Create or update user session
  static createOrUpdateSession(clerkUserId, clerkSessionId, sessionData)
  
  // Get session by window ID
  static getSessionByWindowId(windowId)
  
  // Get all active sessions for user
  static getUserActiveSessions(clerkUserId)
  
  // Update session activity
  static updateSessionActivity(sessionId, metadata)
  
  // Deactivate session
  static deactivateSession(sessionId)
  
  // Cleanup old sessions (keep latest N)
  static cleanupOldSessions(clerkUserId, keepLatest = 5)
  
  // Get session statistics
  static getSessionStats(clerkUserId)
}
```

### 💬 **ConversationService** - **ENHANCED**
```typescript
class ConversationService {
  // Create conversation with session support
  static createConversation(clerkUserId, title, systemPrompt, model, sessionData)
  
  // Get user conversations
  static getUserConversations(clerkUserId, options)
  
  // Get specific conversation with messages
  static getConversation(clerkUserId, conversationId)
  
  // Update conversation title
  static updateConversationTitle(clerkUserId, conversationId, title)
  
  // Delete conversation and messages
  static deleteConversation(clerkUserId, conversationId)
  
  // Archive/unarchive conversation
  static toggleArchiveConversation(clerkUserId, conversationId)
  
  // Pin/unpin conversation
  static togglePinConversation(clerkUserId, conversationId)
}
```

### 📝 **MessageService** - **ENHANCED**
```typescript
class MessageService {
  // Add message to conversation
  static addMessage(clerkUserId, conversationId, role, content, metadata)
  
  // Get messages for conversation
  static getMessages(conversationId, options)
  
  // Update message content
  static updateMessage(clerkUserId, messageId, content)
  
  // Create message edit
  static createMessageEdit(clerkUserId, parentMessageId, newContent)
  
  // Remove messages from index
  static removeMessagesFromIndex(clerkUserId, conversationId, fromIndex)
  
  // Update message status
  static updateMessageStatus(messageId, status, error)
}
```

### 🎯 **ContextWindowService** - **OPTIMIZED**
```typescript
class ContextWindowService {
  // Build optimized context window with memory integration
  static buildContext(clerkUserId, conversationId, tokenBudget, includeSystemPrompt, currentQuery)
  
  // Build enhanced context using memory service
  static buildEnhancedContext(clerkUserId, conversationId, maxTokens, currentQuery)
  
  // Estimate tokens for text
  static estimateTokens(text)
  
  // Get accurate token count for message
  static getMessageTokenCount(message)
}
```

## 🔍 **Optimized Indexes**

### **Session Indexes**
```javascript
// TTL index for automatic cleanup
{ lastActiveAt: 1 } expireAfterSeconds: 2592000 // 30 days

// Compound indexes for efficient queries
{ userId: 1, isActive: 1, lastActiveAt: -1 }
{ clerkUserId: 1, isActive: 1 }
{ windowId: 1, isActive: 1 }
```

### **Conversation Indexes**
```javascript
// User conversations by recency
{ clerkUserId: 1, lastMessageAt: -1 }

// Pinned conversations first
{ clerkUserId: 1, isPinned: -1, lastMessageAt: -1 }

// Session-based conversations
{ sessionId: 1, isActive: 1 }
{ windowId: 1, isActive: 1 }

// Archived conversations
{ clerkUserId: 1, isArchived: 1, lastMessageAt: -1 }
```

### **Message Indexes**
```javascript
// Messages in conversation chronologically
{ conversationId: 1, createdAt: 1 }

// User messages by role
{ clerkUserId: 1, role: 1 }

// Message references and edits
{ parentMessageId: 1 }
{ referencedMessageIds: 1 }

// Content type filtering
{ contentType: 1, createdAt: -1 }

// Token usage analysis
{ 'metadata.usage.totalTokens': -1 }
```

## 🎯 **Key Features**

### **1. Session Management**
- ✅ **TTL Cleanup**: Automatic session expiration after 30 days
- ✅ **Window Tracking**: Each browser tab has unique session
- ✅ **Device Detection**: Browser, OS, device type tracking
- ✅ **Location Tracking**: Country, city, timezone detection
- ✅ **Activity Monitoring**: Real-time session activity updates

### **2. Context Window Optimization**
- ✅ **Token-Based Selection**: Efficient message selection by token count
- ✅ **Cursor-Based Queries**: Memory-efficient database queries
- ✅ **Memory Integration**: Automatic memory context injection
- ✅ **Smart Truncation**: Preserves most recent and relevant messages

### **3. Message References**
- ✅ **Edit Chains**: Track message editing history
- ✅ **Message References**: Link related messages
- ✅ **Content Types**: Support for text, markdown, JSON, etc.
- ✅ **Status Tracking**: Pending, streaming, done, error states

### **4. Performance Features**
- ✅ **Sparse Indexes**: Efficient storage for optional fields
- ✅ **Compound Indexes**: Optimized for common query patterns
- ✅ **Token Caching**: Pre-calculated token counts for speed
- ✅ **Batch Operations**: Efficient bulk operations

## 📈 **Usage Examples**

### **Create Session-Aware Conversation**
```typescript
const conversation = await ConversationService.createConversation(
  clerkUserId,
  "My React Project Discussion",
  "You are a helpful React development assistant.",
  "gemini-1.5-flash",
  {
    windowId: "window-123",
    source: "web",
    windowInfo: {
      userAgent: "Chrome/120.0",
      screenResolution: "1920x1080",
      timezone: "America/New_York"
    }
  }
);
```

### **Build Optimized Context Window**
```typescript
const context = await ContextWindowService.buildContext(
  clerkUserId,
  conversationId,
  4000, // tokenBudget
  true, // includeSystemPrompt
  "How do I implement WebSocket connections?" // currentQuery for memory
);

// Result: { messages, totalTokens, truncated, memoryContext, memoryUsed }
```

### **Track Session Activity**
```typescript
// Update session activity
await SessionService.updateSessionActivity(sessionId, {
  lastAction: "send_message",
  messageCount: 5,
  tokensUsed: 1500
});

// Cleanup old sessions (keep latest 5)
const cleanedUp = await SessionService.cleanupOldSessions(clerkUserId, 5);
```

## 🔧 **Migration Guide**

### **From Old Schema**
1. **Add Session Model**: Create new Session collection
2. **Update Conversations**: Add sessionId and windowId fields
3. **Enhance Messages**: Add contentType and referencedMessageIds
4. **Create Indexes**: Add new compound indexes for performance
5. **Update Services**: Integrate session management in services

### **Database Migration Script**
```javascript
// Add missing fields to existing conversations
db.conversations.updateMany(
  { sessionId: { $exists: false } },
  { $set: { sessionId: null, windowId: null } }
);

// Add contentType to existing messages
db.messages.updateMany(
  { contentType: { $exists: false } },
  { $set: { contentType: "text", referencedMessageIds: [] } }
);
```

## 🎯 **Performance Optimizations**

### **Query Patterns**
- **Session Lookup**: O(1) with windowId index
- **Conversation List**: O(log n) with compound index
- **Message Context**: O(k) where k = selected messages
- **Memory Search**: Integrated with context building

### **Storage Efficiency**
- **Sparse Indexes**: Only index non-null values
- **TTL Cleanup**: Automatic old data removal
- **Token Caching**: Pre-calculated for speed
- **Batch Operations**: Reduce database round trips

Your ChatGPT clone now has **enterprise-grade database architecture** with session management, optimized context windows, and memory integration! 🚀
