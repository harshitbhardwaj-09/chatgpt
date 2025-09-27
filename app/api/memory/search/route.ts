import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { memoryService } from '@/lib/memory-service'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!memoryService.isAvailable()) {
      return Response.json({ 
        memories: [],
        message: 'Memory service not available'
      })
    }

    const { userId: requestedUserId, query, limit = 5 } = await req.json()
    
    // Ensure user can only search their own memories
    if (requestedUserId !== userId) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!query || typeof query !== 'string') {
      return new Response('Invalid query', { status: 400 })
    }

    const memories = await memoryService.searchMemories(userId, query, limit)
    
    return Response.json({
      memories,
      query,
      total: memories.length,
      memoryServiceAvailable: true
    })

  } catch (error) {
    console.error('Memory Search API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
