import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Debug logging
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    console.log('API Key exists:', !!apiKey)
    console.log('API Key first 10 chars:', apiKey?.substring(0, 10))
    console.log('API Key length:', apiKey?.length)

    // Check if API key is available
    if (!apiKey) {
      return new Response("Gemini API key not configured", { status: 500 })
    }

    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Convert chat store messages to proper format
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }))

    // Create Google AI instance with explicit API key
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: formattedMessages,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API Error:", error)
    return new Response(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    })
  }
}
