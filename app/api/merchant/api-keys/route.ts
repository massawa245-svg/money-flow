import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateApiKey } from '@/lib/api-keys'
import { getSessionMerchant } from '@/lib/merchant'
import { logAudit } from '@/lib/audit'

const MAX_ACTIVE_KEYS = 5

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  prefix: true,
  mode: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true
} as const

// GET - API-Schlüssel des Händlers auflisten (ohne Klartext)
export async function GET() {
  try {
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const keys = await prisma.apiKey.findMany({
      where: { merchantId: merchant.id },
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, keys })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/merchant/api-keys:', error)
    return NextResponse.json({ error: 'Schlüssel konnten nicht geladen werden' }, { status: 500 })
  }
}

// POST - Neuen Schlüssel erzeugen. Der Klartext wird nur in dieser Antwort zurückgegeben.
export async function POST(request: Request) {
  try {
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const active = await prisma.apiKey.count({ where: { merchantId: merchant.id, revokedAt: null } })
    if (active >= MAX_ACTIVE_KEYS) {
      return NextResponse.json(
        { error: `Maximal ${MAX_ACTIVE_KEYS} aktive Schlüssel. Bitte zuerst einen widerrufen.` },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : ''

    const { key, prefix, hashedKey } = generateApiKey()
    const created = await prisma.apiKey.create({
      data: { merchantId: merchant.id, name: name || null, prefix, hashedKey, mode: 'test' },
      select: PUBLIC_FIELDS
    })

    await logAudit({ userId: merchant.id, action: 'api_key_created', details: { apiKeyId: created.id } })

    return NextResponse.json({ success: true, key: { ...created, secret: key } })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/api-keys:', error)
    return NextResponse.json({ error: 'Schlüssel konnte nicht erstellt werden' }, { status: 500 })
  }
}
