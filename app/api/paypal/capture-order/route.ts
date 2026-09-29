import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { requireVerified } from '@/lib/kyc'
import { captureOrder, paypalConfigured } from '@/lib/paypal'

// ⚠️ PAYPAL-SANDBOX: Schreibt das bei PayPal (Sandbox) bezahlte Geld dem Wallet gut.
// Die Transfer-ID wird aus der PayPal-Order-ID gebildet, damit eine Bestellung nie doppelt gutgeschrieben wird.
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

    const { orderId } = await request.json()
    if (typeof orderId !== 'string' || !/^[A-Z0-9]{5,40}$/.test(orderId)) {
      return NextResponse.json({ error: 'Ungültige Bestellung' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const blocked = requireVerified(dbUser)
    if (blocked) return blocked

    const transferId = `paypal_${orderId}`
    const existing = await prisma.transfer.findUnique({ where: { id: transferId } })
    if (existing) {
      if (existing.recipientId !== dbUser!.id) {
        return NextResponse.json({ error: 'Ungültige Bestellung' }, { status: 403 })
      }
      return NextResponse.json({ success: true, transfer: existing })
    }

    const result = await captureOrder(orderId)
    const capture = result.data?.purchase_units?.[0]?.payments?.captures?.[0]
    if (!result.ok || result.data?.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      console.error('❌ PayPal capture:', result.status, result.data)
      return NextResponse.json({ error: 'PayPal-Zahlung nicht abgeschlossen' }, { status: 402 })
    }

    // Betrag und Besitzer kommen aus der PayPal-Antwort, nicht vom Client
    if (capture.custom_id !== dbUser!.id || capture.amount?.currency_code !== 'EUR') {
      console.error('❌ PayPal capture passt nicht zum Nutzer:', orderId, capture.custom_id, dbUser!.id)
      return NextResponse.json({ error: 'Ungültige Bestellung' }, { status: 403 })
    }
    const amount = Math.round(parseFloat(capture.amount.value) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Ungültiger Betrag' }, { status: 400 })
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.transfer.create({
        data: {
          id: transferId,
          amount,
          currency: 'EUR',
          senderId: dbUser!.id,
          recipientId: dbUser!.id,
          reference: 'Einzahlung (PayPal Sandbox)',
          status: 'DEPOSIT',
          completedAt: new Date(),
        },
      })
      await tx.user.update({ where: { id: dbUser!.id }, data: { balance: { increment: amount } } })
      return created
    })

    await logAudit({ userId: dbUser!.id, action: 'WALLET_DEPOSIT_PAYPAL', details: { amount, orderId, captureId: capture.id } })
      .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))

    return NextResponse.json({ success: true, transfer })
  } catch (error: any) {
    // Gleichzeitiger zweiter Aufruf: die Bestellung wurde schon gutgeschrieben
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: true })
    }
    console.error('❌ Fehler in POST /api/paypal/capture-order:', error)
    return NextResponse.json({ error: 'PayPal-Gutschrift fehlgeschlagen' }, { status: 500 })
  }
}
