import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { UserService, ConversationService } from "@/lib/db-utils"
import { Metadata } from "next"

interface ConversationPageProps {
  params: {
    conversationId: string
  }
}

export async function generateMetadata({ params }: ConversationPageProps): Promise<Metadata> {
  const { userId } = await auth()
  
  if (!userId) {
    return {
      title: "ChatGPT Clone - Sign In Required"
    }
  }

  // Skip database lookup for temporary conversation IDs
  const isTemporaryId = params.conversationId.startsWith('temp-')
  if (isTemporaryId) {
    return {
      title: "New Conversation - ChatGPT Clone",
      description: "Start a new conversation with ChatGPT"
    }
  }

  try {
    const result = await ConversationService.getConversation(userId, params.conversationId)
    if (result?.conversation?.title) {
      return {
        title: `${result.conversation.title} - ChatGPT Clone`,
        description: `Continue your conversation: ${result.conversation.title}`
      }
    }
  } catch (error) {
    console.error('Failed to get conversation for metadata:', error)
  }

  return {
    title: "Conversation - ChatGPT Clone"
  }
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Validate conversation ID format (MongoDB ObjectId)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/
  if (!objectIdRegex.test(params.conversationId)) {
    notFound()
  }

  // Check if conversation exists and belongs to user
  try {
    const result = await ConversationService.getConversation(userId, params.conversationId)
    if (!result) {
      notFound()
    }
  } catch (error) {
    console.error('Failed to validate conversation:', error)
    notFound()
  }

  // Get the full user data from Clerk and store in background
  const clerkUser = await currentUser()
  
  // Store user in database (non-blocking)
  if (clerkUser) {
    try {
      await UserService.findOrCreateUser(
        clerkUser.id,
        clerkUser.emailAddresses[0]?.emailAddress || '',
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
        clerkUser.imageUrl
      )
    } catch (error) {
      console.error('Failed to store user in database:', error)
      // This is non-critical for the app functionality
    }
  }

  return (
    <div className="full-screen-container">
      <ChatInterface conversationId={params.conversationId} />
    </div>
  )
}
