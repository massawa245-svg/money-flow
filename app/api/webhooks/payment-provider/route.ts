import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// POST - Webhook des regulierten Payment-Partners (z.B. Onafriq).
// Provider können Events mehrfach zustellen, deshalb wird jedes Event
// über (provider, externalId) dedupliziert, bevor es verarbeitet wird.
//
// ⚠️ TODO sobald ein echter Partner angebunden wird: Signatur des Requests
// verifizieren (Signatur-Header des Partners), statt dem Body zu vertrauen.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider, externalId, type, paymentId, providerRef, failureReason } = body

    if (!provider || !externalId || !type || !paymentId) {
      return NextResponse.json({ error: 'Ungültiges Webhook-Payload' }, { status: 400 })
    }

    // 🔒 IDEMPOTENCY: gleiches Event kein zweites Mal verarbeiten
    try {
      await prisma.paymentProviderEvent.create({
        data: {
          provider,
          externalId,
          type,
          payload: JSON.stringify(body),
          paymentId
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`↩️ Webhook-Event bereits verarbeitet: ${provider}/${externalId}`)
        return NextResponse.json({ received: true, duplicate: true })
      }
      throw error
    }

    if (type === 'payment.completed') {
      await prisma.merchantPayment.updateMany({
        where: { id: paymentId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'COMPLETED', providerRef, completedAt: new Date() }
      })
    } else if (type === 'payment.failed') {
      await prisma.merchantPayment.updateMany({
        where: { id: paymentId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'FAILED', failureReason: failureReason || 'Vom Payment-Partner gemeldet' }
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/webhooks/payment-provider:', error)
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
  }
}
