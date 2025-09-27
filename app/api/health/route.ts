import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ status: 'ok', method: 'POST', timestamp: Date.now() })
}