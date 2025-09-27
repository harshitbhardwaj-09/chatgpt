import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/health", "/api/simple-upload"])

export default clerkMiddleware(async (auth, request) => {
  // Allow health check without authentication
  if (!isPublicRoute(request)) {
    try {
      await auth.protect()
    } catch (error) {
      console.error('Auth protection error:', error)
      // Don't throw the error, let the API route handle authentication internally
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
