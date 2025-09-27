const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    console.log('Testing file upload API...');
    
    // Create a test file
    const testContent = 'This is a test document for ChatGPT file upload.\n\nKey information:\n- Project: ChatGPT Clone\n- Features: File upload, document processing\n- Technology: Next.js, MongoDB, Cloudinary\n\nThis content should be processed and available for chat context.';
    
    // Write test file temporarily
    fs.writeFileSync('./test-upload.txt', testContent);
    
    // Create form data
    const form = new FormData();
    form.append('files', fs.createReadStream('./test-upload.txt'), {
      filename: 'test-upload.txt',
      contentType: 'text/plain'
    });
    
    console.log('Sending request to http://localhost:3000/api/upload...');
    
    // Make request
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: form,
      headers: {
        // Note: This won't work without proper authentication
        // But it will help us see if the endpoint responds
        ...form.getHeaders()
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // Clean up
    fs.unlinkSync('./test-upload.txt');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testUpload();