import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    // Simple test - just return file info without processing
    return NextResponse.json({
      success: true,
      data: {
        type: 'document',
        fileType: 'Test',
        fileName: file.name,
        content: 'Test content - file processing temporarily disabled',
        size: file.size,
        wordCount: 3
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process upload: ' + (error as Error).message 
    }, { status: 500 })
  }
}