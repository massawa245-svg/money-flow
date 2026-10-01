import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { quotePayout } from '@/lib/payouts'

// GET ?amount= – wie viel ETB beim Empfänger ankommt (inkl. Gebühr)
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })

    const amount = Number(new URL(request.url).searchParams.get('amount'))
    const quote = await quotePayout(dbUser.currency, amount)
    return NextResponse.json({ quote })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Kein Kurs verfügbar' }, { status: 400 })
  }
}
