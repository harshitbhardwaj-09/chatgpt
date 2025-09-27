import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { memoryService } from '@/lib/memory-service'

export async function DELETE(req: NextRequest) {
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

    const { userId: requestedUserId } = await req.json()
    
    // Ensure user can only clear their own memories
    if (requestedUserId !== userId) {
      return new Response('Forbidden', { status: 403 })
    }

    // Get all memories first
    const allMemories = await memoryService.getAllMemories(userId)
    
    if (allMemories.length === 0) {
      return Response.json({
        success: true,
        message: 'No memories to clear'
      })
    }

    // Delete all memories
    const memoryIds = allMemories.map(m => m.id)
    const success = await memoryService.deleteMemories(memoryIds)
    
    return Response.json({
      success,
      deletedCount: success ? memoryIds.length : 0,
      message: success ? 'All memories cleared successfully' : 'Failed to clear memories'
    })

  } catch (error) {
    console.error('Memory Clear API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
