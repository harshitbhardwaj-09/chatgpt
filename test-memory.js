// Simple test script for Mem0 integration
// Run with: node test-memory.js

import MemoryClient from 'mem0ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testMem0Integration() {
  console.log('🧪 Testing Mem0 Integration...\n');

  // Check if API key is available
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    console.error('❌ MEM0_API_KEY not found in environment variables');
    console.log('Please add MEM0_API_KEY to your .env.local file');
    return;
  }

  console.log('✅ API Key found');

  try {
    // Initialize client
    const client = new MemoryClient({ apiKey });
    console.log('✅ Mem0 client initialized');

    // Test messages
    const testMessages = [
      { role: "user", content: "Hi, I'm testing the memory integration. My name is Harshit and I'm a developer." },
      { role: "assistant", content: "Hello Harshit! Nice to meet you. I see you're a developer testing the memory integration." }
    ];

    const testUserId = "test-user-123";

    // Test 1: Add memories
    console.log('\n📝 Test 1: Adding memories...');
    try {
      await client.add(testMessages, { user_id: testUserId });
      console.log('✅ Memories added successfully');
    } catch (error) {
      console.error('❌ Failed to add memories:', error.message);
      return;
    }

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Search memories
    console.log('\n🔍 Test 2: Searching memories...');
    try {
      const searchQuery = "What do you know about me?";
      const filters = { OR: [{ user_id: testUserId }] };
      
      const results = await client.search(searchQuery, {
        api_version: "v2",
        filters,
        limit: 5
      });

      console.log(`✅ Search completed. Found ${results.length} results:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.memory || result.text || JSON.stringify(result)}`);
      });
    } catch (error) {
      console.error('❌ Failed to search memories:', error.message);
    }

    // Test 3: Get all memories
    console.log('\n📋 Test 3: Getting all memories...');
    try {
      const allMemories = await client.getAll({ user_id: testUserId });
      console.log(`✅ Retrieved ${allMemories.length} total memories`);
    } catch (error) {
      console.error('❌ Failed to get all memories:', error.message);
    }

    console.log('\n🎉 Memory integration test completed!');
    console.log('\nNext steps:');
    console.log('1. Start your Next.js app: npm run dev');
    console.log('2. Start chatting to see memory in action');
    console.log('3. Look for memory indicators in the chat interface');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMem0Integration();
