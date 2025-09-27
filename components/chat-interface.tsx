"use client"

import { useState } from "react"
import { ChatGPTSidebar } from "./chatgpt-sidebar"
import { ChatMain } from "./chat-main"
import { Button } from "./ui/button"
import { Menu, Share, MoreHorizontal } from "lucide-react"

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="relative flex h-screen w-screen flex-row" style={{backgroundColor: 'var(--token-main-surface-primary)'}}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Rail */}
      <div className={`
        relative z-21 h-full shrink-0 overflow-hidden border-e transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-0'} 
        ${sidebarOpen ? 'fixed md:relative' : 'md:relative'}
        ${sidebarOpen ? 'inset-y-0 left-0 md:inset-auto' : ''}
        ${sidebarOpen ? 'z-50 md:z-21' : ''}
        max-md:${sidebarOpen ? 'block' : 'hidden'} md:block
      `} style={{borderColor: 'var(--token-border-light)'}}>
        <ChatGPTSidebar isCollapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main Content */}
      <div className="relative flex h-full max-w-full flex-1 flex-col">
        {/* Mobile Header */}
        <div className="draggable h-14 sticky top-0 z-10 flex items-center border-transparent px-2 md:hidden" style={{backgroundColor: 'var(--token-bg-primary)'}}>
          <div className="no-draggable flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-9 w-9 rounded-md hoverable"
            >
              <Menu className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
            </Button>
          </div>
          <div className="no-draggable flex-1">
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                className="group flex cursor-pointer justify-center items-center gap-1 rounded-lg min-h-9 px-2.5 text-lg font-normal whitespace-nowrap hoverable"
                style={{color: 'var(--token-text-primary)'}}
              >
                <div>ChatGPT</div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="icon-sm" style={{color: 'var(--token-text-tertiary)'}}>
                  <path d="M12.1338 5.94433C12.3919 5.77382 12.7434 5.80202 12.9707 6.02929C13.1979 6.25656 13.2261 6.60807 13.0556 6.8662L12.9707 6.9707L8.47067 11.4707C8.21097 11.7304 7.78896 11.7304 7.52926 11.4707L3.02926 6.9707L2.9443 6.8662C2.77379 6.60807 2.80199 6.25656 3.02926 6.02929C3.25653 5.80202 3.60804 5.77382 3.86617 5.94433L3.97067 6.02929L7.99996 10.0586L12.0293 6.02929L12.1338 5.94433Z"/>
                </svg>
              </Button>
            </div>
          </div>
          <div className="no-draggable flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hoverable"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="icon" style={{color: 'var(--token-text-secondary)'}}>
                <path d="M2.6687 11.333V8.66699C2.6687 7.74455 2.66841 7.01205 2.71655 6.42285C2.76533 5.82612 2.86699 5.31731 3.10425 4.85156L3.25854 4.57617C3.64272 3.94975 4.19392 3.43995 4.85229 3.10449L5.02905 3.02149C5.44666 2.84233 5.90133 2.75849 6.42358 2.71582C7.01272 2.66769 7.74445 2.66797 8.66675 2.66797H9.16675C9.53393 2.66797 9.83165 2.96586 9.83179 3.33301C9.83179 3.70028 9.53402 3.99805 9.16675 3.99805H8.66675C7.7226 3.99805 7.05438 3.99834 6.53198 4.04102C6.14611 4.07254 5.87277 4.12568 5.65601 4.20313L5.45581 4.28906C5.01645 4.51293 4.64872 4.85345 4.39233 5.27149L4.28979 5.45508C4.16388 5.7022 4.08381 6.01663 4.04175 6.53125C3.99906 7.05373 3.99878 7.7226 3.99878 8.66699V11.333C3.99878 12.2774 3.99906 12.9463 4.04175 13.4688C4.08381 13.9833 4.16389 14.2978 4.28979 14.5449L4.39233 14.7285C4.64871 15.1465 5.01648 15.4871 5.45581 15.7109L5.65601 15.7969C5.87276 15.8743 6.14614 15.9265 6.53198 15.958C7.05439 16.0007 7.72256 16.002 8.66675 16.002H11.3337C12.2779 16.002 12.9461 16.0007 13.4685 15.958C13.9829 15.916 14.2976 15.8367 14.5447 15.7109L14.7292 15.6074C15.147 15.3511 15.4879 14.9841 15.7117 14.5449L15.7976 14.3447C15.8751 14.128 15.9272 13.8546 15.9587 13.4688C16.0014 12.9463 16.0017 12.2774 16.0017 11.333V10.833C16.0018 10.466 16.2997 10.1681 16.6667 10.168C17.0339 10.168 17.3316 10.4659 17.3318 10.833V11.333C17.3318 12.2555 17.3331 12.9879 17.2849 13.5771C17.2422 14.0993 17.1584 14.5541 16.9792 14.9717L16.8962 15.1484C16.5609 15.8066 16.0507 16.3571 15.4246 16.7412L15.1492 16.8955C14.6833 17.1329 14.1739 17.2354 13.5769 17.2842C12.9878 17.3323 12.256 17.332 11.3337 17.332H8.66675C7.74446 17.332 7.01271 17.3323 6.42358 17.2842C5.90135 17.2415 5.44665 17.1577 5.02905 16.9785L4.85229 16.8955C4.19396 16.5601 3.64271 16.0502 3.25854 15.4238L3.10425 15.1484C2.86697 14.6827 2.76534 14.1739 2.71655 13.5771C2.66841 12.9879 2.6687 12.2555 2.6687 11.333Z"/>
              </svg>
            </Button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="draggable sticky top-0 p-2 items-center justify-between z-20 h-14 pointer-events-none select-none hidden md:flex" style={{backgroundColor: 'var(--token-main-surface-primary)'}}>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 pointer-events-auto hoverable h-9 w-9 rounded-lg"
            >
              <Menu className="h-5 w-5" style={{color: 'var(--token-text-secondary)'}} />
            </Button>
            <Button
              variant="ghost"
              className="group flex cursor-pointer justify-center items-center gap-1 rounded-lg min-h-9 px-2.5 text-lg font-normal whitespace-nowrap pointer-events-auto hoverable"
              style={{color: 'var(--token-text-primary)'}}
            >
              <div>ChatGPT</div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="icon-sm" style={{color: 'var(--token-text-tertiary)'}}>
                <path d="M12.1338 5.94433C12.3919 5.77382 12.7434 5.80202 12.9707 6.02929C13.1979 6.25656 13.2261 6.60807 13.0556 6.8662L12.9707 6.9707L8.47067 11.4707C8.21097 11.7304 7.78896 11.7304 7.52926 11.4707L3.02926 6.9707L2.9443 6.8662C2.77379 6.60807 2.80199 6.25656 3.02926 6.02929C3.25653 5.80202 3.60804 5.77382 3.86617 5.94433L3.97067 6.02929L7.99996 10.0586L12.0293 6.02929L12.1338 5.94433Z"/>
              </svg>
            </Button>
          </div>
          <div className="flex items-center pointer-events-auto">
            <Button
              variant="ghost"
              className="btn relative mx-2 hoverable"
              style={{color: 'var(--token-text-primary)'}}
            >
              <div className="flex w-full items-center justify-center gap-1.5">
                <Share className="h-5 w-5" />
                Share
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hoverable"
              style={{color: 'var(--token-text-secondary)'}}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Chat Area */}
        <ChatMain />
      </div>
    </div>
  )
}
