import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { ConversationService, MessageService } from "@/lib/db-utils"
import connectDB from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query.trim()) {
      return NextResponse.json({ 
        conversations: [],
        total: 0,
        hasMore: false 
      })
    }

    // Search in conversation titles and message content
    const searchResults = await ConversationService.searchConversations(
      userId,
      query.trim(),
      limit,
      offset
    )

    return NextResponse.json({
      conversations: searchResults.conversations,
      total: searchResults.total,
      hasMore: searchResults.hasMore,
      query: query.trim()
    })

  } catch (error) {
    console.error('Search conversations error:', error)
    return NextResponse.json(
      { error: "Failed to search conversations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      query, 
      filters = {}, 
      limit = 20, 
      offset = 0,
      sortBy = 'relevance' // 'relevance' | 'date' | 'title'
    } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ 
        conversations: [],
        total: 0,
        hasMore: false 
      })
    }

    await connectDB()

    // Advanced search with filters
    const searchResults = await ConversationService.advancedSearch(
      userId,
      query.trim(),
      {
        ...filters,
        limit,
        offset,
        sortBy
      }
    )

    return NextResponse.json({
      conversations: searchResults.conversations,
      total: searchResults.total,
      hasMore: searchResults.hasMore,
      query: query.trim(),
      filters: filters,
      sortBy
    })

  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json(
      { error: "Failed to perform advanced search" },
      { status: 500 }
    )
  }
}
