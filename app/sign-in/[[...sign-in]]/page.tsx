import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border-border shadow-lg",
          },
        }}
        redirectUrl="/"
      />
    </div>
  )
}
