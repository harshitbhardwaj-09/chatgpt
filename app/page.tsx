import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { UserService } from "@/lib/db-utils"

export default async function HomePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Get the full user data from Clerk
  const clerkUser = await currentUser()
  
  if (clerkUser) {
    // Automatically store/update user in our database
    try {
      await UserService.findOrCreateUser({
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username,
        imageUrl: clerkUser.imageUrl
      })
    } catch (error) {
      console.error('Failed to store user in database:', error)
      // Continue to chat interface even if DB storage fails
    }
  }

  return (
    <div className="full-screen-container">
      <ChatInterface />
    </div>
  )
}
