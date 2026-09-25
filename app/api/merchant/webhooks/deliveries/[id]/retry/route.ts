import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'
import { ratelimit } from '@/lib/rate-limit'
import { deliverWithRetries } from '@/lib/webhooks'

// POST - Eine Zustellung erneut senden (gleiche Event-ID, damit der Shop Duplikate erkennt)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const { success } = await ratelimit.limit(`webhook-retry-${merchant.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id, endpoint: { merchantId: merchant.id } },
      select: { id: true }
    })
    if (!delivery) {
      return NextResponse.json({ error: 'Zustellung nicht gefunden' }, { status: 404 })
    }

    await deliverWithRetries(delivery.id, { maxAttempts: 1 })
    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
      select: { status: true, responseStatus: true, lastError: true }
    })

    return NextResponse.json({ success: true, delivery: updated })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/webhooks/deliveries/[id]/retry:', error)
    return NextResponse.json({ error: 'Erneutes Senden fehlgeschlagen' }, { status: 500 })
  }
}
