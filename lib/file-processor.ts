// Dynamic imports to avoid build issues
const loadLibraries = async () => {
  try {
    const [mammoth, XLSX] = await Promise.all([
      import('mammoth'),
      import('xlsx')
    ]);
    
    return { mammoth, XLSX };
  } catch (error) {
    console.error('Error loading libraries:', error);
    throw error;
  }
};

export interface ProcessedFile {
  originalName: string;
  mimeType: string;
  size: number;
  extractedText: string;
  metadata?: any;
  cloudinaryUrl: string;
  publicId: string;
}

/**
 * Extract text from PDF files
 * Note: PDF processing is temporarily disabled due to compatibility issues
 */
export const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  console.log('PDF processing requested but temporarily disabled');
  return '[PDF text extraction is temporarily disabled. Please convert your PDF to a Word document or plain text file for processing.]';
};

/**
 * Extract text from Word documents
 */
export const extractTextFromWord = async (buffer: Buffer): Promise<string> => {
  try {
    const { mammoth } = await loadLibraries();
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '[No text found in Word document]';
  } catch (error) {
    console.error('Error extracting text from Word document:', error);
    return `[Error reading Word document: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

/**
 * Extract text from Excel files
 */
export const extractTextFromExcel = async (buffer: Buffer): Promise<string> => {
  try {
    const { XLSX } = await loadLibraries();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let extractedText = '';
    
    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      extractedText += `Sheet: ${sheetName}\n${csvData}\n\n`;
    });
    
    return extractedText || '[No data found in Excel file]';
  } catch (error) {
    console.error('Error extracting text from Excel file:', error);
    return `[Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

/**
 * Extract text from images using OCR
 * Note: OCR processing is temporarily disabled due to compatibility issues
 */
export const extractTextFromImage = async (buffer: Buffer): Promise<string> => {
  console.log('Image OCR processing requested but temporarily disabled');
  return '[Image OCR is temporarily disabled. Please describe the image content in your message or convert the image text to a document format.]';
};

/**
 * Extract text from plain text files
 */
export const extractTextFromPlainText = async (buffer: Buffer): Promise<string> => {
  try {
    const text = buffer.toString('utf-8');
    return text || '[Empty file]';
  } catch (error) {
    console.error('Error extracting text from plain text file:', error);
    return `[Error reading text file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

/**
 * Main function to process any file type
 */
export const processFile = async (
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ extractedText: string; metadata?: any }> => {
  let extractedText = '';
  let metadata: any = {};

  try {
    // Process based on MIME type
    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer);
      metadata.pages = extractedText.split('\n').length;
    } 
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             mimeType === 'application/msword') {
      extractedText = await extractTextFromWord(buffer);
    }
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             mimeType === 'application/vnd.ms-excel') {
      extractedText = await extractTextFromExcel(buffer);
    }
    else if (mimeType.startsWith('image/')) {
      // For images, extract text via OCR (currently disabled)
      extractedText = await extractTextFromImage(buffer);
      
      // Basic image metadata without sharp
      metadata = {
        type: 'image',
        format: mimeType.split('/')[1],
        note: 'Image processing available but OCR temporarily disabled'
      };
    }
    else if (mimeType === 'text/plain' || 
             mimeType === 'text/csv' ||
             mimeType === 'application/json' ||
             mimeType === 'text/markdown') {
      extractedText = await extractTextFromPlainText(buffer);
    }
    else {
      // For unsupported file types, try to read as text
      try {
        extractedText = await extractTextFromPlainText(buffer);
      } catch {
        extractedText = `[File type ${mimeType} not supported for text extraction]`;
      }
    }

    // Add general metadata
    metadata.originalName = originalName;
    metadata.mimeType = mimeType;
    metadata.size = buffer.length;
    metadata.extractedLength = extractedText.length;
    metadata.processedAt = new Date().toISOString();

    return { extractedText, metadata };
  } catch (error) {
    console.error('Error processing file:', error);
    return { 
      extractedText: `[Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}]`,
      metadata: { error: true, originalName, mimeType }
    };
  }
};

/**
 * Get supported file types
 */
export const getSupportedFileTypes = () => {
  return {
    documents: [
      // 'application/pdf', // Temporarily disabled
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown'
    ],
    images: [
      // Temporarily disabled due to OCR compatibility issues
      // 'image/jpeg',
      // 'image/png',
      // 'image/gif',
      // 'image/webp',
      // 'image/bmp',
      // 'image/tiff'
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  };
};

/**
 * Validate file type and size
 */
export const validateFile = (mimeType: string, size: number): { isValid: boolean; error?: string } => {
  const supportedTypes = getSupportedFileTypes();
  const allSupportedTypes = [...supportedTypes.documents, ...supportedTypes.images];
  
  if (!allSupportedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not supported. Supported types: ${allSupportedTypes.join(', ')}`
    };
  }
  
  if (size > supportedTypes.maxSize) {
    return {
      isValid: false,
      error: `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${supportedTypes.maxSize / 1024 / 1024}MB`
    };
  }
  
  return { isValid: true };
};