import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { memoryService } from '@/lib/memory-service'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const url = new URL(req.url)
    const requestedUserId = url.searchParams.get('userId')
    
    // Ensure user can only access their own memories
    if (requestedUserId !== userId) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!memoryService.isAvailable()) {
      return Response.json({ 
        memories: [],
        message: 'Memory service not available'
      })
    }

    const memories = await memoryService.getAllMemories(userId)
    
    return Response.json({
      memories,
      total: memories.length,
      memoryServiceAvailable: true
    })

  } catch (error) {
    console.error('Memory API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!memoryService.isAvailable()) {
      return Response.json({ 
        success: false,
        message: 'Memory service not available'
      }, { status: 503 })
    }

    const { messages, customInstructions } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }

    const success = await memoryService.addMemories(userId, messages, customInstructions)
    
    return Response.json({
      success,
      message: success ? 'Memories added successfully' : 'Failed to add memories'
    })

  } catch (error) {
    console.error('Memory API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
