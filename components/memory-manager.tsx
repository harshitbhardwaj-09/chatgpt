"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Trash2, Brain, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { Input } from './ui/input'
import { toast } from './ui/use-toast'

interface Memory {
  id: string
  memory: string
  score: number
  metadata?: Record<string, any>
  createdAt?: string
}

interface MemoryStats {
  totalMemories: number
  memoryUsed: boolean
  lastUpdate?: string
}

export function MemoryManager({ userId }: { userId: string }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Memory[]>([])
  const [stats, setStats] = useState<MemoryStats>({
    totalMemories: 0,
    memoryUsed: false
  })
  const [isSearching, setIsSearching] = useState(false)

  // Load all memories
  const loadMemories = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/memory?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
        setStats({
          totalMemories: data.memories?.length || 0,
          memoryUsed: data.memories?.length > 0,
          lastUpdate: new Date().toISOString()
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load memories",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
      toast({
        title: "Error",
        description: "Failed to load memories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Search memories
  const searchMemories = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          query: searchQuery,
          limit: 10 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.memories || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to search memories",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to search memories:', error)
      toast({
        title: "Error", 
        description: "Failed to search memories",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Delete memory
  const deleteMemory = async (memoryId: string) => {
    try {
      const response = await fetch(`/api/memory/${memoryId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMemories(prev => prev.filter(m => m.id !== memoryId))
        setSearchResults(prev => prev.filter(m => m.id !== memoryId))
        setStats(prev => ({
          ...prev,
          totalMemories: prev.totalMemories - 1
        }))
        toast({
          title: "Success",
          description: "Memory deleted successfully"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete memory",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast({
        title: "Error",
        description: "Failed to delete memory", 
        variant: "destructive"
      })
    }
  }

  // Clear all memories
  const clearAllMemories = async () => {
    if (!confirm('Are you sure you want to delete all memories? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/memory/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setMemories([])
        setSearchResults([])
        setStats({
          totalMemories: 0,
          memoryUsed: false,
          lastUpdate: new Date().toISOString()
        })
        toast({
          title: "Success",
          description: "All memories cleared successfully"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to clear memories",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to clear memories:', error)
      toast({
        title: "Error",
        description: "Failed to clear memories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMemories()
  }, [userId])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMemories()
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const displayMemories = searchQuery.trim() ? searchResults : memories

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h2 className="text-2xl font-bold">Memory Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadMemories}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {memories.length > 0 && (
            <Button
              onClick={clearAllMemories}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMemories}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.memoryUsed ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Inactive</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Memories</CardTitle>
          <CardDescription>
            Search through your conversation memories to find specific information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={searchMemories}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Search className={`h-4 w-4 ${isSearching ? 'animate-pulse' : ''}`} />
            </Button>
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 text-sm text-gray-600">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memories List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {searchQuery.trim() ? 'Search Results' : 'All Memories'}
          </CardTitle>
          <CardDescription>
            {searchQuery.trim() 
              ? `Memories matching "${searchQuery}"`
              : 'All stored conversation memories'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading memories...</span>
            </div>
          ) : displayMemories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery.trim() 
                ? 'No memories found matching your search'
                : 'No memories stored yet. Start chatting to build your memory!'
              }
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {displayMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {memory.memory}
                      </p>
                      <div className="flex items-center gap-2">
                        {memory.score && (
                          <Badge variant="secondary" className="text-xs">
                            Score: {memory.score.toFixed(2)}
                          </Badge>
                        )}
                        {memory.metadata?.createdAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(memory.metadata.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteMemory(memory.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Memory Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Memory Service Status</CardTitle>
          <CardDescription>
            Information about the Mem0 AI memory service integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Memory service integrated</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Context window optimization enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Automatic memory processing active</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>How it works:</strong> Your conversations are automatically processed to extract and store relevant memories. 
              These memories are then used to provide more personalized and context-aware responses in future chats.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
