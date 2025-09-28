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
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        fileType = 'PDF'
        try {
          // Primary: pdf-parse (fast, simple)
          const pdfParse = (await import('pdf-parse')).default as (dataBuffer: Buffer) => Promise<any>
          const result = await pdfParse(buffer)
          extractedText = (result?.text || '').trim()

          // If pdf-parse returns too little text, try a fallback
          if (!extractedText || extractedText.split(/\s+/).length < 5) {
            throw new Error('Insufficient text from pdf-parse, trying fallback')
          }
        } catch (primaryError) {
          console.warn('pdf-parse failed or insufficient text, trying pdfjs-dist fallback:', primaryError)
          try {
            // Fallback: pdfjs-dist text extraction
            const pdfjs = await import('pdfjs-dist')
            // @ts-ignore - worker not strictly needed in Node for textContent
            const { getDocument } = pdfjs as any
            const loadingTask = getDocument({ data: buffer })
            const pdf = await loadingTask.promise
            const maxPages = Math.min(pdf.numPages, 25) // hard cap to avoid heavy PDFs
            let textContent = ''
            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
              const page = await pdf.getPage(pageNum)
              const content = await page.getTextContent()
              const pageText = content.items.map((i: any) => (i.str || '')).join(' ')
              textContent += (pageNum > 1 ? '\n\n' : '') + pageText
              // Early stop if we already have plenty of text
              if (textContent.length > 250_000) break
            }
            extractedText = textContent.trim()

            if (!extractedText) {
              throw new Error('No text extracted via pdfjs-dist')
            }
          } catch (fallbackError) {
            console.error('PDF fallback extraction failed:', fallbackError)
            extractedText = `PDF file received: "${file.name}" (${Math.round(file.size / 1024)} KB).\n\n`
              + `We couldn't automatically extract text from this PDF. It may be scanned or image-based. `
              + `Try uploading a text-friendly version (TXT or DOCX) or copy/paste the relevant text.`
          }
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