import MemoryClient from 'mem0ai'

interface MemoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface MemorySearchResult {
  id: string
  memory: string
  score: number
  metadata?: Record<string, any>
}

interface ContextWindow {
  messages: MemoryMessage[]
  totalTokens: number
  trimmed: boolean
  memoryContext?: string[]
}

export class MemoryService {
  private client: MemoryClient | null = null
  private maxContextTokens: number
  private tokensPerMessage: number = 100 // Approximate tokens per message

  constructor(apiKey?: string, maxContextTokens: number = 4000) {
    this.maxContextTokens = maxContextTokens
    
    if (apiKey || process.env.MEM0_API_KEY) {
      try {
        this.client = new MemoryClient({
          apiKey: apiKey || process.env.MEM0_API_KEY!
        })
        console.log('✅ Mem0 client initialized successfully')
      } catch (error) {
        console.warn('⚠️ Failed to initialize Mem0 client:', error)
        this.client = null
      }
    } else {
      console.warn('⚠️ Mem0 API key not found. Memory features will be disabled.')
    }
  }

  /**
   * Check if memory service is available
   */
  isAvailable(): boolean {
    return this.client !== null
  }

  /**
   * Add memories from a conversation
   */
  async addMemories(
    userId: string, 
    messages: MemoryMessage[], 
    customInstructions?: string
  ): Promise<boolean> {
    if (!this.client) {
      console.warn('Memory service not available')
      return false
    }

    try {
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      await this.client.add(formattedMessages, { user_id: userId })

      console.log(`✅ Added memories for user: ${userId}`)
      return true
    } catch (error) {
      console.error('❌ Failed to add memories:', error)
      return false
    }
  }

  /**
   * Search for relevant memories
   */
  async searchMemories(
    userId: string, 
    query: string, 
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    if (!this.client) {
      return []
    }

    try {
      const filters = {
        OR: [{ user_id: userId }]
      }

      const response = await this.client.search(query, {
        api_version: "v2",
        filters,
        limit
      })

      // Transform response to our format
      const results: MemorySearchResult[] = []
      if (response && Array.isArray(response)) {
        response.forEach((item: any) => {
          if (item.memory) {
            results.push({
              id: item.id || Math.random().toString(36),
              memory: item.memory,
              score: item.score || 0,
              metadata: item.metadata
            })
          }
        })
      }

      console.log(`🔍 Found ${results.length} relevant memories for query: "${query}"`)
      return results
    } catch (error) {
      console.error('❌ Failed to search memories:', error)
      return []
    }
  }

  /**
   * Get all memories for a user
   */
  async getAllMemories(userId: string): Promise<MemorySearchResult[]> {
    if (!this.client) {
      return []
    }

    try {
      const response = await this.client.getAll({ user_id: userId })
      
      const results: MemorySearchResult[] = []
      if (response && Array.isArray(response)) {
        response.forEach((item: any) => {
          if (item.memory) {
            results.push({
              id: item.id || Math.random().toString(36),
              memory: item.memory,
              score: 1.0,
              metadata: item.metadata
            })
          }
        })
      }

      return results
    } catch (error) {
      console.error('❌ Failed to get all memories:', error)
      return []
    }
  }

  /**
   * Delete specific memories
   */
  async deleteMemories(memoryIds: string[]): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      for (const memoryId of memoryIds) {
        await this.client.delete(memoryId)
      }
      console.log(`🗑️ Deleted ${memoryIds.length} memories`)
      return true
    } catch (error) {
      console.error('❌ Failed to delete memories:', error)
      return false
    }
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Build context window with memory integration and token limits
   */
  async buildContextWindow(
    userId: string,
    messages: MemoryMessage[],
    currentQuery?: string
  ): Promise<ContextWindow> {
    let contextMessages = [...messages]
    let totalTokens = 0
    let memoryContext: string[] = []

    // Calculate current message tokens
    for (const message of messages) {
      totalTokens += this.estimateTokens(message.content)
    }

    // If memory service is available and we have a current query, search for relevant memories
    if (this.isAvailable() && currentQuery) {
      try {
        const relevantMemories = await this.searchMemories(userId, currentQuery, 3)
        
        if (relevantMemories.length > 0) {
          memoryContext = relevantMemories.map(memory => memory.memory)
          
          // Add memory context tokens
          const memoryTokens = memoryContext.reduce(
            (sum, memory) => sum + this.estimateTokens(memory), 0
          )
          totalTokens += memoryTokens

          console.log(`📝 Added ${relevantMemories.length} relevant memories (${memoryTokens} tokens)`)
        }
      } catch (error) {
        console.error('Failed to fetch memory context:', error)
      }
    }

    // Trim context if it exceeds the limit
    let trimmed = false
    if (totalTokens > this.maxContextTokens) {
      trimmed = true
      
      // Keep the most recent messages and system message (if any)
      const systemMessages = contextMessages.filter(msg => msg.role === 'assistant' && msg.content.startsWith('System:'))
      let recentMessages = contextMessages.filter(msg => !(msg.role === 'assistant' && msg.content.startsWith('System:')))
      
      let remainingTokens = this.maxContextTokens
      
      // Reserve tokens for memory context
      if (memoryContext.length > 0) {
        const memoryTokens = memoryContext.reduce(
          (sum, memory) => sum + this.estimateTokens(memory), 0
        )
        remainingTokens -= memoryTokens
      }

      // Keep as many recent messages as possible
      const trimmedMessages: MemoryMessage[] = []
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const message = recentMessages[i]
        const messageTokens = this.estimateTokens(message.content)
        
        if (remainingTokens - messageTokens > 0) {
          trimmedMessages.unshift(message)
          remainingTokens -= messageTokens
        } else {
          break
        }
      }

      contextMessages = [...systemMessages, ...trimmedMessages]
      
      // Recalculate total tokens after trimming
      totalTokens = contextMessages.reduce(
        (sum, msg) => sum + this.estimateTokens(msg.content), 0
      )
      if (memoryContext.length > 0) {
        totalTokens += memoryContext.reduce(
          (sum, memory) => sum + this.estimateTokens(memory), 0
        )
      }

      console.log(`✂️ Trimmed context: ${messages.length} → ${contextMessages.length} messages (${totalTokens} tokens)`)
    }

    return {
      messages: contextMessages,
      totalTokens,
      trimmed,
      memoryContext
    }
  }

  /**
   * Process conversation for memory storage
   */
  async processConversation(
    userId: string,
    messages: MemoryMessage[],
    customInstructions?: string
  ): Promise<void> {
    if (!this.isAvailable() || messages.length < 2) {
      return
    }

    try {
      // Only process conversations with meaningful exchanges
      const userMessages = messages.filter(msg => msg.role === 'user')
      const assistantMessages = messages.filter(msg => msg.role === 'assistant')
      
      if (userMessages.length > 0 && assistantMessages.length > 0) {
        await this.addMemories(userId, messages, customInstructions)
      }
    } catch (error) {
      console.error('Failed to process conversation for memory:', error)
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService()
