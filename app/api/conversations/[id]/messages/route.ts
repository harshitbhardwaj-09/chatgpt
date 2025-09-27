import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MessageService } from '@/lib/db-utils'

// POST /api/conversations/[id]/messages - Add a message to conversation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, content } = await request.json()
    
    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      )
    }

    const result = await MessageService.addMessage(
      userId,
      params.id,
      role,
      content
    )
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to add message' }, { status: 404 })
    }

    return NextResponse.json({ message: result.message, conversation: result.conversation })
  } catch (error) {
    console.error('Error adding message:', error)
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    )
  }
}

// PUT /api/conversations/[id]/messages/[messageId] - Edit a message
export async function PUT(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const message = await MessageService.updateMessage(
      userId,
      params.messageId,
      content
    )
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error editing message:', error)
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    )
  }
}