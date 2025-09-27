import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { memoryService } from '@/lib/memory-service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memoryId = params.id
    if (!memoryId) {
      return new Response('Memory ID required', { status: 400 })
    }

    const success = await memoryService.deleteMemories([memoryId])
    
    return Response.json({
      success,
      message: success ? 'Memory deleted successfully' : 'Failed to delete memory'
    })

  } catch (error) {
    console.error('Memory Delete API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
