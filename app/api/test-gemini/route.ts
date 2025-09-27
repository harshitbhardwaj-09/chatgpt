import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    
    if (!apiKey) {
      return Response.json({ error: "No API key found" }, { status: 500 })
    }

    console.log('Testing API key:', apiKey.substring(0, 10) + '...')
    
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: "Say hello in one word"
    })

    return Response.json({ 
      success: true, 
      response: text,
      keyLength: apiKey.length 
    })
  } catch (error: any) {
    console.error('Test API Error:', error)
    return Response.json({ 
      error: error.message,
      type: error.constructor.name,
      keyExists: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    }, { status: 500 })
  }
}