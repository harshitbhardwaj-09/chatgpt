# 🔧 AI Response Issues - Troubleshooting Guide

## 🚨 Current Issue: AI Not Responding

### **Problem**: Gemini API returning 503 "Service Unavailable" errors

## 🎯 **Immediate Solutions**

### **Solution 1: Check API Key**
```bash
# Check your .env.local file has:
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here

# Make sure it starts with: AIzaSy...
```

### **Solution 2: Try Different Model**
The app now uses `gemini-1.5-flash` instead of `gemini-2.5-flash` for better stability.

### **Solution 3: Wait and Retry**
Gemini API sometimes has temporary outages. Wait 2-3 minutes and try again.

### **Solution 4: Use OpenAI Backup** (If you have OpenAI API key)
```bash
# Add to .env.local:
OPENAI_API_KEY=your_openai_key_here

# Then change the API endpoint in your frontend to use /api/chat-backup
```

## 🔍 **Diagnostic Steps**

### **1. Check Server Status**
```bash
curl http://localhost:3000
# Should return HTML with "ChatGPT" in it
```

### **2. Test API Endpoint**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

### **3. Check Console Logs**
Look for these in your terminal:
- ✅ `Mem0 client initialized successfully`
- ❌ `API Error: The service is currently unavailable`
- ❌ `Failed after 3 attempts`

## 🛠️ **Quick Fixes Applied**

### **Error Handling Improvements**
- ✅ Better error messages for users
- ✅ Automatic retry with exponential backoff
- ✅ 30-second timeout protection
- ✅ Fallback to stable model version

### **Model Changes**
- ✅ Changed from `gemini-2.5-flash` to `gemini-1.5-flash`
- ✅ Added proper timeout handling
- ✅ Improved memory integration

## 📊 **Status Check Commands**

### **Check if App is Running**
```bash
curl -s http://localhost:3000 | grep "ChatGPT"
# Should output: ChatGPT
```

### **Check API Health**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/chat
# Should output: 405 (Method Not Allowed is expected for GET)
```

### **Test Memory Service**
```bash
node test-memory.js
# Should show memory service status
```

## 🔧 **Manual Fixes**

### **If Gemini API is Down**
1. **Wait**: Usually resolves in 5-10 minutes
2. **Check Status**: Visit [Google Cloud Status](https://status.cloud.google.com/)
3. **Use Backup**: Switch to OpenAI temporarily

### **If Memory Service Issues**
1. **Check Mem0 Status**: Visit [app.mem0.ai](https://app.mem0.ai/)
2. **Disable Memory**: Comment out memory integration temporarily
3. **Use Without Memory**: App will still work without memory features

## 🎯 **Expected Behavior When Working**

### **Successful Chat Flow:**
1. User sends message
2. Console shows: `🧠 Memory integration: X memories added to context`
3. AI responds with streaming text
4. Memory indicators appear: 🧠 Memory (X)
5. Response completes successfully

### **Memory Integration Signs:**
- Blue memory badge: 🧠 Memory (2)
- Orange optimization badge: ⚡ Optimized
- Console logs showing memory processing

## 🚀 **Recovery Steps**

### **Step 1: Restart Development Server**
```bash
# Stop current server
pkill -f "next dev"

# Start fresh
npm run dev
```

### **Step 2: Clear Cache**
```bash
# Clear Next.js cache
rm -rf .next/cache

# Restart
npm run dev
```

### **Step 3: Test Basic Functionality**
1. Open http://localhost:3000
2. Sign in with Clerk
3. Try sending a simple message like "hello"
4. Check browser console for errors

## 📱 **User Experience During Issues**

### **What Users See:**
- Loading spinner that doesn't complete
- Error message: "The AI service is temporarily unavailable"
- Retry button or suggestion to wait

### **What Users Should Do:**
1. Wait 30 seconds and try again
2. Refresh the page
3. Check internet connection
4. Try a shorter message

## 🔍 **Debug Information**

### **Key Files to Check:**
- `app/api/chat/route.ts` - Main chat API
- `lib/memory-service.ts` - Memory integration
- `components/chat-main.tsx` - Frontend chat logic
- `.env.local` - Environment variables

### **Common Error Patterns:**
- `503 Service Unavailable` → Gemini API down
- `401 Unauthorized` → Missing/invalid API key
- `Timeout` → Network or API latency issues
- `Memory service not available` → Mem0 API issues

## ✅ **Success Indicators**

### **Everything Working:**
- ✅ App loads at localhost:3000
- ✅ User can sign in
- ✅ Chat interface appears
- ✅ Messages send and receive responses
- ✅ Memory indicators show up
- ✅ No console errors

### **Partial Working:**
- ✅ App loads but no AI responses → API issue
- ✅ AI responds but no memory → Memory service issue
- ✅ Memory works but slow responses → API latency

---

**Need More Help?**
1. Check the console logs in your terminal
2. Look at browser developer tools console
3. Try the test script: `node test-memory.js`
4. Restart the development server
