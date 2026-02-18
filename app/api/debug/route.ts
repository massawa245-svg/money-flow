import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log("\n DEBUG-API AUFRUFEN")
  
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  const result = {
    timestamp: new Date().toISOString(),
    cookieCount: allCookies.length,
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + '...',
      hasSession: c.name.includes('sb-')
    })),
    hasSessionCookie: allCookies.some(c => c.name.includes('sb-'))
  }
  
  console.log(" Debug-Result:", result)
  
  return NextResponse.json(result)
}
