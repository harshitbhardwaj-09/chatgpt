# 🧠 Memory Integration Setup Guide

This guide will help you set up Mem0.ai memory integration for your ChatGPT clone application.

## 🚀 Features Added

- **Intelligent Context Window Management**: Automatically trims conversation history to fit model context limits
- **Memory-Enhanced Responses**: Uses Mem0.ai to store and retrieve relevant conversation memories
- **Smart Memory Processing**: Automatically extracts and stores important information from conversations
- **Memory Management UI**: Full interface to view, search, and manage stored memories
- **Real-time Memory Indicators**: Visual feedback showing when memory is being used

## 📋 Prerequisites

1. **Mem0.ai Account**: Sign up at [app.mem0.ai](https://app.mem0.ai/)
2. **API Key**: Get your API key from the Mem0 dashboard

## 🔧 Environment Setup

Add the following environment variable to your `.env.local` file:

```bash
# Mem0 AI Memory Service
MEM0_API_KEY=your_mem0_api_key_here

# Optional: Custom memory configuration
# MEM0_MAX_CONTEXT_TOKENS=4000
# MEM0_MEMORY_RESERVE_RATIO=0.2
```

## 📦 Installation

The required packages are already installed:
- `mem0ai` - Official Mem0 SDK

## 🎯 How It Works

### 1. **Context Window Management**
- Automatically estimates token usage for messages
- Reserves 20% of context window for memory (configurable)
- Trims older messages when approaching token limits
- Prioritizes recent messages and system prompts

### 2. **Memory Processing**
- Conversations are automatically processed after assistant responses
- Relevant information is extracted and stored as memories
- Memories are associated with user IDs for personalization

### 3. **Memory Retrieval**
- When a new message is sent, relevant memories are searched
- Top matching memories are added to the context as system messages
- AI responses become more personalized and context-aware

### 4. **Smart Indicators**
- Blue "Memory" badge shows when memories are being used
- Orange "Optimized" badge indicates context trimming
- Hover tooltips provide detailed information

## 🛠️ Components Added

### Core Services
- `lib/memory-service.ts` - Main memory service wrapper
- Enhanced `lib/db-utils.ts` - Context window management with memory integration

### API Routes
- `app/api/memory/route.ts` - Get/add memories
- `app/api/memory/search/route.ts` - Search memories
- `app/api/memory/[id]/route.ts` - Delete specific memory
- `app/api/memory/clear/route.ts` - Clear all memories

### UI Components
- `components/memory-manager.tsx` - Full memory management interface
- `components/memory-indicator.tsx` - Memory status indicators

## 🚀 Usage

### Basic Usage
The memory system works automatically once the API key is configured. No additional setup required!

### Memory Management
Access the memory management interface by adding a route to your app:

```typescript
// app/memory/page.tsx
import { MemoryManager } from '@/components/memory-manager'
import { auth } from '@clerk/nextjs/server'

export default async function MemoryPage() {
  const { userId } = await auth()
  
  if (!userId) {
    return <div>Please sign in to manage memories</div>
  }

  return (
    <div className="container mx-auto py-8">
      <MemoryManager userId={userId} />
    </div>
  )
}
```

### Custom Memory Instructions
You can provide custom instructions for memory extraction:

```typescript
// In your API route or service
await memoryService.addMemories(userId, messages, "Focus on user preferences and important decisions")
```

## 📊 Configuration Options

### Context Window Settings
```typescript
// In memory-service.ts constructor
const memoryService = new MemoryService(apiKey, {
  maxContextTokens: 4000,        // Total context limit
  memoryReserveRatio: 0.2,       // % reserved for memory
  tokensPerMessage: 100          // Estimated tokens per message
})
```

### Memory Search Settings
```typescript
// When searching memories
const memories = await memoryService.searchMemories(userId, query, {
  limit: 5,           // Max memories to retrieve
  scoreThreshold: 0.5 // Minimum relevance score
})
```

## 🔍 Monitoring & Debugging

### Console Logs
The system provides detailed logging:
- `✅ Mem0 client initialized successfully`
- `📝 Added X memories to context (Y tokens)`
- `✂️ Context truncated: using X messages (Y tokens)`
- `🧠 Memory integration: X memories added to context`

### Response Headers
API responses include memory information:
- `X-Memory-Used: true/false`
- `X-Memory-Count: number`
- `X-Context-Truncated: true/false`

### Error Handling
The system gracefully handles:
- Missing API keys (memory features disabled)
- API failures (fallback to regular chat)
- Context overflow (automatic trimming)

## 🎨 Customization

### Memory Indicator Styling
Customize the memory indicators in `memory-indicator.tsx`:

```typescript
<Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
  <Brain className="h-3 w-3 mr-1" />
  Memory ({memoryCount})
</Badge>
```

### Context Window Logic
Modify context building in `db-utils.ts`:

```typescript
// Reserve more/less tokens for memory
const reservedTokensForMemory = Math.min(1000, maxTokens * 0.25) // 25% instead of 20%
```

## 🚨 Troubleshooting

### Memory Service Not Available
- Check if `MEM0_API_KEY` is set correctly
- Verify API key is valid in Mem0 dashboard
- Check console for initialization errors

### Context Window Issues
- Adjust `maxContextTokens` if responses are truncated
- Monitor token usage in console logs
- Consider reducing `memoryReserveRatio` for longer conversations

### Memory Search Not Working
- Ensure conversations have meaningful exchanges (user + assistant)
- Check if memories are being created (use Memory Manager UI)
- Verify search queries are relevant to stored memories

## 📈 Performance Tips

1. **Token Optimization**: Use shorter system prompts to save tokens for memory
2. **Memory Pruning**: Regularly clear old/irrelevant memories
3. **Search Relevance**: Use specific queries for better memory retrieval
4. **Batch Processing**: Memory processing happens in background to avoid blocking

## 🔐 Security Notes

- API keys are server-side only (never exposed to client)
- User memories are isolated by user ID
- Memory API routes include proper authentication checks
- Sensitive information should be excluded from memory processing

## 🎉 Success Indicators

When everything is working correctly, you should see:
- Memory badges appearing in chat interface
- Personalized responses referencing past conversations
- Context optimization working smoothly
- Memory management UI functioning properly

## 📚 Additional Resources

- [Mem0.ai Documentation](https://docs.mem0.ai/)
- [Mem0 Python SDK](https://github.com/mem0ai/mem0)
- [Context Window Best Practices](https://docs.mem0.ai/quickstart)

Happy chatting with enhanced memory! 🚀
