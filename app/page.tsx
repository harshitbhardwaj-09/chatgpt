import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { UserService } from "@/lib/db-utils"

export default async function HomePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
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
      <ChatInterface />
    </div>
  )
}
