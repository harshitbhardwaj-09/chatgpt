import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { groq } from "@ai-sdk/groq"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const prompt = convertToModelMessages(messages)

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    messages: prompt,
    abortSignal: req.signal,
    maxTokens: 2000,
    temperature: 0.7,
  })

  return result.toUIMessageStreamResponse({
    onFinish: async ({ isAborted }) => {
      if (isAborted) {
        console.log("Chat request aborted")
      }
    },
  })
}
