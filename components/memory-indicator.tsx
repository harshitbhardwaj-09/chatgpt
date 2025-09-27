"use client"

import React from 'react'
import { Brain, Zap, Clock } from 'lucide-react'
import { Badge } from './ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface MemoryIndicatorProps {
  memoryUsed?: boolean
  memoryCount?: number
  contextTruncated?: boolean
  className?: string
}

export function MemoryIndicator({ 
  memoryUsed = false, 
  memoryCount = 0, 
  contextTruncated = false,
  className = "" 
}: MemoryIndicatorProps) {
  if (!memoryUsed && !contextTruncated) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {memoryUsed && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="secondary" 
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-help"
              >
                <Brain className="h-3 w-3 mr-1" />
                Memory ({memoryCount})
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">Memory Active</p>
                <p>Using {memoryCount} relevant memories from past conversations</p>
                <p className="text-xs text-gray-500 mt-1">
                  This helps provide more personalized responses
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {contextTruncated && (
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="secondary" 
                className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800 cursor-help"
              >
                <Zap className="h-3 w-3 mr-1" />
                Optimized
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">Context Optimized</p>
                <p>Conversation history was trimmed to fit context window</p>
                <p className="text-xs text-gray-500 mt-1">
                  Most recent and relevant messages are prioritized
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

interface MemoryStatusProps {
  isProcessing?: boolean
  lastMemoryUpdate?: string
  className?: string
}

export function MemoryStatus({ 
  isProcessing = false, 
  lastMemoryUpdate,
  className = "" 
}: MemoryStatusProps) {
  if (!isProcessing && !lastMemoryUpdate) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        {isProcessing && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3 animate-pulse text-blue-500" />
                <span>Processing memories...</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Learning from this conversation</p>
            </TooltipContent>
          </Tooltip>
        )}

        {lastMemoryUpdate && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Memory updated {new Date(lastMemoryUpdate).toLocaleTimeString()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Last time memories were updated</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
