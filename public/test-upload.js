// Test file upload functionality
const testFileUpload = async () => {
  try {
    // Create a test file
    const testContent = 'This is a test file for upload functionality.';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    console.log('Test file created:', {
      name: testFile.name,
      type: testFile.type,
      size: testFile.size
    });

    // Create FormData
    const formData = new FormData();
    formData.append('files', testFile);

    console.log('FormData created with file');

    // Send to API
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Upload successful:', data);
    } else {
      console.error('Upload failed:', responseText);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run test when page loads
window.testFileUpload = testFileUpload;
console.log('Test function available as window.testFileUpload()');