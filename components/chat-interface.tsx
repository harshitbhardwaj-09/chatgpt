"use client"

import { useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMain } from "./chat-main"
import { Button } from "./ui/button"
import { Menu } from "lucide-react"

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <ChatSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ChatMain />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
