import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'  //  DAS HAT GEFEHLT!
import { NextResponse } from 'next/server'

export async function GET() {
  console.log("\n TEST-API AUFRUFEN")
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    // 1. Cookies testen (DIREKT)
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    results.tests.cookies = {
      count: allCookies.length,
      names: allCookies.map(c => c.name),
      hasSession: allCookies.some(c => c.name.includes('sb-'))
    }
    console.log(" Cookies:", results.tests.cookies)

    // 2. Supabase Session testen
    console.log(" Teste Supabase Session...")
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    results.tests.supabase = {
      success: !!user,
      user: user ? {
        email: user.email,
        id: user.id
      } : null,
      error: error?.message || null
    }
    console.log(" Supabase:", results.tests.supabase)

    // 3. Headers testen
    const headersList = await cookies()
    results.tests.headers = {
      hasCookieHeader: allCookies.length > 0
    }

    // 4. Prisma Verbindung testen (nur wenn User eingeloggt)
    if (user) {
      console.log(" Teste Prisma für User:", user.email)
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { id: true, email: true, balance: true }
      })
      
      results.tests.prisma = {
        success: !!dbUser,
        user: dbUser || null,
        message: dbUser ? ' User in DB gefunden' : ' User nicht in DB'
      }
      
      // 5. Transfers testen
      if (dbUser) {
        const transfers = await prisma.transfer.findMany({
          where: {
            OR: [
              { senderId: dbUser.id },
              { recipientId: dbUser.id }
            ]
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
        results.tests.transfers = {
          count: transfers.length,
          recent: transfers
        }
      }
    } else {
      results.tests.prisma = { 
        success: false, 
        message: ' Kein User eingeloggt - bitte zuerst einloggen' 
      }
    }

  } catch (error: any) {
    results.error = {
      message: error.message,
      stack: error.stack
    }
  }

  return NextResponse.json(results)
}
