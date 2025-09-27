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

    const { messages, conversationId, windowId, userMessage } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Store user message in database if provided
    let dbConversationId = conversationId
    if (userMessage && userMessage.content) {
      try {
        if (!dbConversationId) {
          // Create new conversation
          const conversation = await ConversationService.createConversation(
            userId,
            userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
            undefined, // systemPrompt
            'gemini-2.5-flash'
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

    // Get context window for better AI responses
    let contextMessages = messages
    if (dbConversationId) {
      try {
        const context = await ContextWindowService.buildContext(userId, dbConversationId, 4000)
        contextMessages = context.messages
      } catch (error) {
        console.error('Failed to build context window:', error)
        // Fall back to provided messages
      }
    }

    // Convert messages to proper format
    const formattedMessages = contextMessages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }))

    // Create Google AI instance with explicit API key
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const startTime = Date.now()
    let responseContent = ''
    let firstTokenTime: number | undefined

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: formattedMessages,
      temperature: 0.7,
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
          if (dbConversationId) {
            // Store assistant response in database
            const { message } = await MessageService.addMessage(
              userId,
              dbConversationId,
              'assistant',
              text,
              {
                windowId,
                source: 'web',
                model: 'gemini-2.5-flash',
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
        'X-Window-Id': windowId || ''
      }
    })
  } catch (error) {
    console.error("Chat API Error:", error)
    return new Response(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    })
  }
}
