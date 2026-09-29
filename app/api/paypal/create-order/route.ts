import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { requireVerified } from '@/lib/kyc'
import { createOrder, paypalConfigured } from '@/lib/paypal'

// ⚠️ PAYPAL-SANDBOX: Testzahlung, kein echtes Geld
const MAX_DEPOSIT = 1000

export async function POST(request: Request) {
  try {
    if (!paypalConfigured()) {
      return NextResponse.json({ error: 'PayPal ist nicht eingerichtet' }, { status: 503 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { success } = await ratelimit.limit(`paypal-${user.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const { amount } = await request.json()
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: 'Ungültiger Betrag (mindestens 1 €)' }, { status: 400 })
    }
    if (amount > MAX_DEPOSIT) {
      return NextResponse.json({ error: `Maximal ${MAX_DEPOSIT.toLocaleString('de-DE')} pro Einzahlung` }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const blocked = requireVerified(dbUser)
    if (blocked) return blocked

    const order = await createOrder(Math.round(amount * 100) / 100, dbUser!.id)
    if (!order.ok) {
      console.error('❌ PayPal create order:', order.status, order.data)
      return NextResponse.json({ error: 'PayPal-Bestellung fehlgeschlagen' }, { status: 502 })
    }

    return NextResponse.json({ id: order.data.id })
  } catch (error) {
    console.error('❌ Fehler in POST /api/paypal/create-order:', error)
    return NextResponse.json({ error: 'PayPal-Bestellung fehlgeschlagen' }, { status: 500 })
  }
}
