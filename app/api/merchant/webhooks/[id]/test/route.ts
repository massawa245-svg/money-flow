import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'
import { ratelimit } from '@/lib/rate-limit'
import { createWebhookEvent, deliverWithRetries } from '@/lib/webhooks'

// POST - Test-Event "ping" an einen Endpoint senden und auf das Ergebnis warten
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const { success } = await ratelimit.limit(`webhook-test-${merchant.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const [deliveryId] = await createWebhookEvent(merchant.id, 'ping', { message: 'Test-Event' }, id)
    if (!deliveryId) {
      return NextResponse.json({ error: 'Webhook nicht gefunden' }, { status: 404 })
    }

    // Nur ein Versuch, damit der Händler das Ergebnis sofort sieht
    await deliverWithRetries(deliveryId, { maxAttempts: 1 })
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      select: { status: true, responseStatus: true, lastError: true }
    })

    return NextResponse.json({ success: true, delivery })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/webhooks/[id]/test:', error)
    return NextResponse.json({ error: 'Test-Event konnte nicht gesendet werden' }, { status: 500 })
  }
}
