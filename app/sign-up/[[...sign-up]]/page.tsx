import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignUp
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
