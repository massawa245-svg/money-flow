import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { paymentProvider } from '@/lib/payment-provider'
import { logAudit } from '@/lib/audit'

// POST - Kunde bestätigt die Zahlung (nach Biometric-Check in der App).
// Die eigentliche Geldbewegung läuft über paymentProvider (regulierter Partner),
// dieser Handler pflegt nur den Status-/Ledger-Eintrag.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { success } = await ratelimit.limit(`pay-confirm-${user.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const payer = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!payer) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
    }

    const payment = await prisma.merchantPayment.findUnique({ where: { id } })
    if (!payment) {
      return NextResponse.json({ error: 'Zahlung nicht gefunden' }, { status: 404 })
    }

    if (payment.expiresAt < new Date()) {
      await prisma.merchantPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json({ error: 'QR-Code ist abgelaufen' }, { status: 410 })
    }

    // 🔒 Optimistischer Lock: nur EIN Request darf PENDING -> PROCESSING schaffen.
    // Verhindert doppelte Bestätigung bei Doppelklick/parallelen Requests.
    const claimed = await prisma.merchantPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PROCESSING', payerId: payer.id }
    })

    if (claimed.count === 0) {
      return NextResponse.json({ error: 'Zahlung ist bereits in Bearbeitung oder abgeschlossen' }, { status: 409 })
    }

    const result = await paymentProvider.authorize({
      paymentId: payment.id,
      payerId: payer.id,
      amount: payment.amount,
      currency: payment.currency
    })

    const updated = await prisma.merchantPayment.update({
      where: { id: payment.id },
      data: result.success
        ? { status: 'COMPLETED', providerRef: result.providerRef, completedAt: new Date() }
        : { status: 'FAILED', failureReason: result.failureReason || 'Vom Payment-Partner abgelehnt' }
    })

    await logAudit({
      userId: payer.id,
      action: result.success ? 'merchant_payment_completed' : 'merchant_payment_failed',
      details: { paymentId: payment.id, amount: payment.amount, currency: payment.currency }
    })

    return NextResponse.json({ success: result.success, payment: updated })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/pay/[id]/confirm:', error)
    return NextResponse.json({ error: error.message || 'Bestätigung fehlgeschlagen' }, { status: 400 })
  }
}
