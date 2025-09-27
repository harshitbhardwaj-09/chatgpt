import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { processFile, validateFile, getSupportedFileTypes } from '@/lib/file-processor';
import connectDB from '@/lib/mongodb';

// Note: Body parsing is handled by formData() in App Router

interface UploadedFile {
  id: string;
  originalName: string;
  cloudinaryUrl: string;
  publicId: string;
  mimeType: string;
  size: number;
  extractedText: string;
  metadata: any;
  uploadedAt: string;
}

/**
 * Handle file upload
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Upload API - Starting request processing');
    
    // Check authentication
    const { userId } = await auth();
    console.log('Upload API - Auth result:', { userId: userId ? 'present' : 'missing' });
    
    if (!userId) {
      console.log('Upload API - Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse form data
    console.log('Upload API - Parsing form data...');
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    console.log('Upload API - Received files:', files?.length || 0)
    console.log('Upload API - Files data:', files?.map(f => ({ name: f?.name, type: f?.type, size: f?.size })))
    
    // Log all form data entries for debugging
    console.log('Upload API - All form entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]))
    
    if (!files || files.length === 0) {
      console.log('Upload API - No files provided')
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadedFiles: UploadedFile[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file
        const validation = validateFile(file.type, file.size);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process file to extract text
        const { extractedText, metadata } = await processFile(
          buffer,
          file.name,
          file.type
        );

        // Upload to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(buffer, {
          folder: `chatgpt-uploads/${userId}`,
          resource_type: file.type.startsWith('image/') ? 'image' : 'raw',
          tags: ['chatgpt-upload', userId],
        });

        // Create file record
        const uploadedFile: UploadedFile = {
          id: cloudinaryResult.public_id,
          originalName: file.name,
          cloudinaryUrl: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
          mimeType: file.type,
          size: file.size,
          extractedText,
          metadata: {
            ...metadata,
            cloudinary: {
              bytes: cloudinaryResult.bytes,
              format: cloudinaryResult.format,
              resource_type: cloudinaryResult.resource_type,
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
            },
          },
          uploadedAt: new Date().toISOString(),
        };

        uploadedFiles.push(uploadedFile);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        return NextResponse.json(
          { error: `Error processing file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded and processed ${uploadedFiles.length} file(s)`,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get supported file types
 */
export async function GET() {
  try {
    console.log('Upload API - GET request received');
    const { userId } = await auth();
    console.log('Upload API - GET Auth result:', { userId: userId ? 'present' : 'missing' });
    
    if (!userId) {
      console.log('Upload API - GET Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supportedTypes = getSupportedFileTypes();
    console.log('Upload API - GET Returning supported types');
    return NextResponse.json({
      supportedTypes: {
        documents: supportedTypes.documents,
        images: supportedTypes.images,
        maxSize: supportedTypes.maxSize,
        maxFiles: 5,
      }
    });
  } catch (error) {
    console.error('Error getting supported file types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}