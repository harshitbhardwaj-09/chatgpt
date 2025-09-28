import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { auth } from "@clerk/nextjs/server"
import { MessageService, ConversationService, ContextWindowService, UsageLogService } from "@/lib/db-utils"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Debug logging
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    console.log('API Key exists:', !!apiKey)
    console.log('API Key first 10 chars:', apiKey?.substring(0, 10))
    console.log('API Key length:', apiKey?.length)

    // Check if API key is available
    if (!apiKey) {
      return new Response("Gemini API key not configured", { status: 500 })
    }

    const { messages, conversationId, windowId, userMessage, attachments } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Store user message in database if provided (skip if temporary ID)
    let dbConversationId = conversationId
    const isTemporaryId = conversationId?.startsWith('temp-')
    
    if (userMessage && userMessage.content && !isTemporaryId) {
      try {
        if (!dbConversationId) {
          // Create new conversation
          const conversation = await ConversationService.createConversation(
            userId,
            userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
            undefined, // systemPrompt
            'gemini-1.5-flash'
          )
          dbConversationId = (conversation as any)._id.toString()
        }

        // Add user message to database
        await MessageService.addMessage(
          userId,
          dbConversationId,
          'user',
          userMessage.content,
          { windowId, source: 'web' }
        )
      } catch (error) {
        console.error('Failed to store user message:', error)
        // Continue with API call even if DB storage fails
      }
    }

    // Get context window with memory integration for better AI responses
    let contextMessages = messages
    let memoryContext: string[] = []
    let memoryUsed = false
    
    if (dbConversationId && !isTemporaryId) {
      try {
        // Extract current query from user message for memory search
        const currentQuery = userMessage?.content || messages[messages.length - 1]?.content

        const context = await ContextWindowService.buildContext(
          userId, 
          dbConversationId, 
          4000, // tokenBudget
          true, // includeSystemPrompt
          currentQuery // for memory search
        )
        
        contextMessages = context.messages
        memoryContext = context.memoryContext || []
        memoryUsed = context.memoryUsed
        
        if (memoryUsed) {
          console.log(`🧠 Memory integration: ${memoryContext.length} memories added to context`)
        }
        
        if (context.truncated) {
          console.log(`✂️ Context truncated: using ${context.messages.length} messages (${context.totalTokens} tokens)`)
        }
      } catch (error) {
        console.error('Failed to build context window:', error)
        // Fall back to provided messages
      }
    }

    // Convert messages to proper format
    let formattedMessages = contextMessages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 
            msg.role === 'system' ? 'system' as const : 'assistant' as const,
      content: msg.content,
    }))

    // Add file attachment content if available
    if (attachments && attachments.length > 0) {
      let fileContextContent = ''
      
      for (const attachment of attachments) {
        if (attachment.type === 'document' && attachment.content) {
          fileContextContent += `\n\n--- File: ${attachment.fileName} (${attachment.fileType}) ---\n${attachment.content}\n--- End of ${attachment.fileName} ---`
        } else if (attachment.type === 'image') {
          fileContextContent += `\n\n--- Image: ${attachment.fileName} ---\n[Image content available for analysis]\n--- End of ${attachment.fileName} ---`
        }
      }
      
      if (fileContextContent) {
        // Add file content as a system message
        const fileSystemMessage = {
          role: 'system' as const,
          content: `The user has provided the following file(s) for context:${fileContextContent}\n\nPlease analyze and reference this content when answering the user's questions.`
        }
        
        // Insert file context before user messages
        const systemMessages = formattedMessages.filter(msg => msg.role === 'system')
        const nonSystemMessages = formattedMessages.filter(msg => msg.role !== 'system')
        
        formattedMessages = [...systemMessages, fileSystemMessage, ...nonSystemMessages]
      }
    }

    // Add memory context as system message if available
    if (memoryUsed && memoryContext.length > 0) {
      const memorySystemMessage = {
        role: 'system' as const,
        content: `Previous conversation context from memory:\n${memoryContext.map((memory, index) => `${index + 1}. ${memory}`).join('\n')}\n\nPlease use this context to provide more personalized and relevant responses.`
      }
      
      // Insert memory context after any existing system messages but before user messages
      const systemMessages = formattedMessages.filter(msg => msg.role === 'system')
      const nonSystemMessages = formattedMessages.filter(msg => msg.role !== 'system')
      
      formattedMessages = [...systemMessages, memorySystemMessage, ...nonSystemMessages]
    }

    // Create Google AI instance with explicit API key
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

  const startTime = Date.now()
  let responseContent = ''
  let firstTokenTime: number | undefined

    // Try different Gemini models as fallback
    let modelToUse = "gemini-2.5-flash" // More stable model
    
    const result = streamText({
      model: google(modelToUse),
      messages: formattedMessages,
      temperature: 0.7,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(30000), // 30 second timeout
      onChunk: ({ chunk }) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now()
        }
        if (chunk.type === 'text-delta') {
          responseContent += chunk.text
        }
      },
      onFinish: async ({ text, usage, finishReason }) => {
        const endTime = Date.now()
        
        try {
          if (dbConversationId && !isTemporaryId) {
            // Prefer the fully buffered streamed content if onFinish text is empty
            const rawFinalText = (text ?? responseContent)
            const finalText = (rawFinalText || '').trim()

            if (!finalText) {
              console.warn('Assistant returned empty content. Skipping message save to avoid validation error.')
              return
            }
            // Store assistant response in database
            const { message } = await MessageService.addMessage(
              userId,
              dbConversationId,
              'assistant',
              finalText,
              {
                windowId,
                source: 'web',
                model: modelToUse,
                finishReason,
                usage
              }
            )

            // Log usage for analytics with actual message ID
            try {
              await UsageLogService.logUsage(
                userId,
                dbConversationId,
                (message._id as any).toString(),
                'gemini-2.5-flash',
                'chat',
                {
                  promptTokens: (usage as any)?.promptTokens || 0,
                  completionTokens: (usage as any)?.completionTokens || 0,
                  totalTokens: (usage as any)?.totalTokens || 0
                },
                {
                  responseTimeMs: endTime - startTime,
                  streamingTimeMs: endTime - startTime,
                  firstTokenTimeMs: firstTokenTime ? firstTokenTime - startTime : undefined
                },
                { windowId, finishReason }
              )
            } catch (usageError) {
              console.error('Failed to log usage:', usageError)
              // Don't throw - usage logging failure shouldn't break the chat
            }
          }
        } catch (error) {
          console.error('Failed to store assistant response:', error)
        }
      }
    })

    return result.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': dbConversationId || '',
        'X-Window-Id': windowId || '',
        'X-Memory-Used': memoryUsed ? 'true' : 'false',
        'X-Memory-Count': memoryContext.length.toString(),
        'X-New-Conversation': (!conversationId && dbConversationId) ? 'true' : 'false',
        'X-Context-Truncated': contextMessages.length < messages.length ? 'true' : 'false'
      }
    })
  } catch (error) {
    console.error("Chat API Error:", error)
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('service is currently unavailable') || error.message.includes('503')) {
        return new Response(JSON.stringify({
          error: 'The AI service is temporarily unavailable. Please try again in a few moments.',
          type: 'service_unavailable',
          retryAfter: 30
        }), { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30'
          }
        })
      }
      
      if (error.message.includes('API key')) {
        return new Response(JSON.stringify({
          error: 'AI service configuration error. Please check API keys.',
          type: 'configuration_error'
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred. Please try again.',
      type: 'unknown_error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
