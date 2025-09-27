"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, Home, ArrowLeft } from 'lucide-react'

export default function ConversationNotFound() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6 max-w-md px-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-200 dark:bg-gray-800 p-4">
            <MessageCircle className="h-12 w-12 text-gray-400 dark:text-gray-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Conversation not found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The conversation you're looking for doesn't exist or may have been deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Start New Chat
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help text */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>
            If you think this is an error, please check the URL or try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  )
}
