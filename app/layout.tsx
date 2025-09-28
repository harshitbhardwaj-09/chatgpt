import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import "./globals.css"
import { Suspense } from "react"
import { ThemeProvider } from "../lib/theme-provider"

export const metadata: Metadata = {
  title: "ChatGPT Clone",
  description: "An exact ChatGPT UI clone built with Next.js and TypeScript",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "oklch(0.7 0.15 142)",
          colorBackground: "oklch(0.11 0 0)",
          colorInputBackground: "oklch(0.18 0 0)",
          colorText: "oklch(0.95 0 0)",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased h-screen w-screen overflow-hidden`}>
          {/* Skip to content for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-black focus:text-white focus:p-2"
          >
            Skip to main content
          </a>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <Suspense fallback={null}>{children}</Suspense>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
