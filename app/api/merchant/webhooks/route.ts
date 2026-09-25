import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'
import { generateWebhookSecret, validateWebhookUrl } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

const MAX_ENDPOINTS = 3

// GET - Webhook-Endpoints des Händlers (ohne Secret)
export async function GET() {
  try {
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { merchantId: merchant.id },
      select: { id: true, url: true, enabled: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, endpoints })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/merchant/webhooks:', error)
    return NextResponse.json({ error: 'Webhooks konnten nicht geladen werden' }, { status: 500 })
  }
}

// POST - Endpoint anlegen. Das Signatur-Secret wird nur in dieser Antwort zurückgegeben.
export async function POST(request: Request) {
  try {
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const count = await prisma.webhookEndpoint.count({ where: { merchantId: merchant.id } })
    if (count >= MAX_ENDPOINTS) {
      return NextResponse.json({ error: `Maximal ${MAX_ENDPOINTS} Webhook-URLs` }, { status: 400 })
    }

    const { url } = await request.json().catch(() => ({}))
    const urlError = await validateWebhookUrl(url)
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 })
    }

    const secret = generateWebhookSecret()
    const endpoint = await prisma.webhookEndpoint.create({
      data: { merchantId: merchant.id, url, secret },
      select: { id: true, url: true, enabled: true, createdAt: true }
    })

    await logAudit({ userId: merchant.id, action: 'webhook_endpoint_created', details: { endpointId: endpoint.id } })

    return NextResponse.json({ success: true, endpoint: { ...endpoint, secret } })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/webhooks:', error)
    return NextResponse.json({ error: 'Webhook konnte nicht angelegt werden' }, { status: 500 })
  }
}
