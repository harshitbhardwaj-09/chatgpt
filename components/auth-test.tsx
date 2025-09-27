'use client'
import { useUser } from '@clerk/nextjs'

export default function AuthTest() {
  const { user, isLoaded, isSignedIn } = useUser()

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Auth Test</h3>
      <p>Is loaded: {isLoaded ? 'Yes' : 'No'}</p>
      <p>Is signed in: {isSignedIn ? 'Yes' : 'No'}</p>
      <p>User ID: {user?.id || 'None'}</p>
      <p>User email: {user?.emailAddresses?.[0]?.emailAddress || 'None'}</p>
    </div>
  )
}