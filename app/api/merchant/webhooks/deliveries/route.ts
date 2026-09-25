import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'

// GET - Die letzten Zustellungen aller Endpoints des Händlers
export async function GET() {
  try {
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpoint: { merchantId: merchant.id } },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        payload: true,
        status: true,
        attempts: true,
        responseStatus: true,
        lastError: true,
        lastAttemptAt: true,
        createdAt: true,
        endpoint: { select: { url: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({ success: true, deliveries })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/merchant/webhooks/deliveries:', error)
    return NextResponse.json({ error: 'Protokoll konnte nicht geladen werden' }, { status: 500 })
  }
}
