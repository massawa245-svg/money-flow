import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse, after } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { paymentProvider } from '@/lib/payment-provider'
import { logAudit } from '@/lib/audit'
import { requireVerified } from '@/lib/kyc'
import { serializeCheckout } from '@/lib/checkout'
import { dispatchWebhookEvent } from '@/lib/webhooks'

// POST - Kunde bestätigt die Zahlung (nach Biometric-Check in der App).
// ⚠️ TESTMODUS: paymentProvider ist ein Mock; das Guthaben wird nur in der
// Datenbank vom Kunden zum Händler umgebucht, es fließt kein echtes Geld.
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

    const blocked = requireVerified(payer)
    if (blocked) return blocked

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

    if (payment.merchantId === payer.id) {
      return NextResponse.json({ error: 'Du kannst nicht an dich selbst zahlen' }, { status: 400 })
    }

    if (payment.currency !== payer.currency) {
      return NextResponse.json(
        { error: `Währung passt nicht: Zahlung in ${payment.currency}, dein Konto in ${payer.currency}` },
        { status: 400 }
      )
    }

    // Vorab-Prüfung, damit die Zahlung bei zu wenig Guthaben PENDING bleibt und erneut versucht werden kann
    if (payer.balance < payment.amount) {
      return NextResponse.json({ error: 'Nicht genügend Guthaben' }, { status: 400 })
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

    if (!result.success) {
      const failed = await prisma.merchantPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: result.failureReason || 'Vom Payment-Partner abgelehnt' }
      })
      await logAudit({
        userId: payer.id,
        action: 'merchant_payment_failed',
        details: { paymentId: payment.id, amount: payment.amount, currency: payment.currency }
      })
      return NextResponse.json({ success: false, payment: failed })
    }

    // Guthaben umbuchen: Abbuchung nur, wenn das Guthaben im selben Moment noch reicht
    const updated = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: payer.id, balance: { gte: payment.amount } },
        data: { balance: { decrement: payment.amount } }
      })
      if (debited.count === 0) throw new Error('INSUFFICIENT_FUNDS')

      await tx.user.update({
        where: { id: payment.merchantId },
        data: { balance: { increment: payment.amount } }
      })

      return tx.merchantPayment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', providerRef: result.providerRef, completedAt: new Date() }
      })
    }).catch(async (error) => {
      // Zahlung wieder freigeben, damit der Kunde es erneut versuchen kann
      await prisma.merchantPayment.updateMany({
        where: { id: payment.id, status: 'PROCESSING' },
        data: { status: 'PENDING', payerId: null }
      })
      throw error.message === 'INSUFFICIENT_FUNDS' ? new Error('Nicht genügend Guthaben') : error
    })

    await logAudit({
      userId: payer.id,
      action: 'merchant_payment_completed',
      details: { paymentId: payment.id, amount: payment.amount, currency: payment.currency }
    })

    // Händler benachrichtigen, nachdem der Kunde seine Antwort hat
    const origin = new URL(request.url).origin
    after(() => dispatchWebhookEvent(updated.merchantId, 'payment.completed', serializeCheckout(updated, origin)))

    return NextResponse.json({ success: true, payment: updated })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/pay/[id]/confirm:', error)
    return NextResponse.json({ error: error.message || 'Bestätigung fehlgeschlagen' }, { status: 400 })
  }
}
