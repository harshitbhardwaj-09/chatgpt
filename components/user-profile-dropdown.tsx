"use client"

import React, { useState, useRef, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { 
  User,
  Sparkles, 
  Palette, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronUp
} from "lucide-react"

interface UserProfileDropdownProps {
  className?: string
}

export function UserProfileDropdown({ className }: UserProfileDropdownProps) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    try {
      setIsOpen(false)
      await signOut(() => {
        router.push('/sign-in')
      })
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/sign-in')
    }
  }

  const handleUpgradePlan = () => {
    console.log('Upgrade plan clicked')
    setIsOpen(false)
  }

  const handlePersonalization = () => {
    console.log('Personalization clicked')
    setIsOpen(false)
  }

  const handleSettings = () => {
    console.log('Settings clicked')
    setIsOpen(false)
  }

  const handleHelp = () => {
    window.open('https://help.openai.com/', '_blank')
    setIsOpen(false)
  }

  if (!user) {
    return null
  }

  const menuItems = [
    { icon: Sparkles, label: 'Upgrade plan', onClick: handleUpgradePlan },
    { icon: Palette, label: 'Personalization', onClick: handlePersonalization },
    { icon: Settings, label: 'Settings', onClick: handleSettings },
    { separator: true },
    { icon: HelpCircle, label: 'Help', onClick: handleHelp, hasArrow: true },
    { separator: true },
    { icon: LogOut, label: 'Log out', onClick: handleSignOut, isLogout: true }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 justify-between gap-3 rounded-lg px-3 hoverable group ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{backgroundColor: 'var(--token-surface-primary)'}}>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
              <span className="text-xs font-medium">
                {user.firstName?.charAt(0)?.toUpperCase() || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="truncate text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
              {user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'}
            </span>
            <span className="text-xs" style={{color: 'var(--token-text-secondary)'}}>
              Free
            </span>
          </div>
        </div>
        <ChevronUp 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          style={{color: 'var(--token-text-secondary)'}} 
        />
      </Button>
      
      {isOpen && (
        <div 
          className="absolute bottom-full mb-2 left-0 w-64 rounded-xl border shadow-xl z-[9999]"
          style={{
            backgroundColor: 'var(--token-main-surface-primary)',
            borderColor: 'var(--token-border-light)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b" style={{borderColor: 'var(--token-border-light)'}}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                <span className="text-sm font-medium">
                  {user.firstName?.charAt(0)?.toUpperCase() || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium" style={{color: 'var(--token-text-primary)'}}>
                  {user.emailAddresses[0]?.emailAddress || 'user@example.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item.separator) {
                return (
                  <div key={index} className="my-1 mx-1 border-t" style={{borderColor: 'var(--token-border-light)'}} />
                )
              }
              
              const Icon = item.icon!
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`w-full px-3 py-2 cursor-pointer rounded-md mx-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center ${
                    item.isLogout ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : ''
                  }`}
                >
                  <Icon 
                    className={`mr-3 h-4 w-4 ${item.isLogout ? 'text-red-600' : ''}`} 
                    style={item.isLogout ? {} : {color: 'var(--token-text-secondary)'}} 
                  />
                  <span 
                    className={item.isLogout ? 'text-red-600' : ''}
                    style={item.isLogout ? {} : {color: 'var(--token-text-primary)'}}
                  >
                    {item.label}
                  </span>
                  {item.hasArrow && (
                    <ChevronUp className="ml-auto h-4 w-4 rotate-90" style={{color: 'var(--token-text-secondary)'}} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2" style={{borderColor: 'var(--token-border-light)'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                  <span className="text-xs font-medium">
                    {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium" style={{color: 'var(--token-text-primary)'}}>
                    {user.firstName || 'User'}
                  </span>
                  <span className="text-xs" style={{color: 'var(--token-text-secondary)'}}>
                    Free
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpgradePlan}
                className="h-6 px-2 text-xs border rounded-md"
                style={{
                  borderColor: 'var(--token-border-light)',
                  color: 'var(--token-text-primary)'
                }}
              >
                Upgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}