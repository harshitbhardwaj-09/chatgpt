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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let extractedText = ''
    let fileType = ''

    try {
      // Handle different file types
      if (file.type === 'application/pdf') {
        fileType = 'PDF'
        try {
          // Temporarily disable PDF parsing to avoid library issues
          // TODO: Fix pdf-parse library ENOENT error
          throw new Error('PDF parsing temporarily disabled due to library issues')
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError)
          // Return a helpful message for PDF files
          extractedText = `PDF file received: "${file.name}" (${Math.round(file.size / 1024)} KB). 
          
Note: PDF text extraction is temporarily unavailable due to a library configuration issue. 
You can still upload the file and reference it in your conversation, but the text content cannot be automatically extracted at this time.

Please try uploading the content as a text file (.txt) or Word document (.docx) instead for automatic text extraction.`
        }
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        fileType = 'DOCX'
        // Dynamic import to avoid issues with mammoth
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        fileType = 'Text'
        extractedText = buffer.toString('utf-8')
      } else if (file.type.startsWith('image/')) {
        fileType = 'Image'
        // For images, we'll return the base64 data and let the LLM handle it
        const base64 = buffer.toString('base64')
        const mimeType = file.type
        
        return NextResponse.json({
          success: true,
          data: {
            type: 'image',
            fileType,
            fileName: file.name,
            mimeType,
            content: base64,
            size: file.size
          }
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Unsupported file type. Supported formats: PDF, DOCX, TXT, and images (PNG, JPG, JPEG, WEBP)' 
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: {
          type: 'document',
          fileType,
          fileName: file.name,
          content: extractedText.trim(),
          size: file.size,
          wordCount: extractedText.trim().split(/\s+/).length
        }
      })

    } catch (parseError) {
      console.error('File parsing error:', parseError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to parse ${fileType} file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process upload: ' + (error as Error).message 
    }, { status: 500 })
  }
}