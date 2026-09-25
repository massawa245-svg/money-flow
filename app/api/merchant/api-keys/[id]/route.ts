import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'
import { logAudit } from '@/lib/audit'

// DELETE - Schlüssel widerrufen. Er bleibt zur Nachvollziehbarkeit gespeichert, funktioniert aber nicht mehr.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const revoked = await prisma.apiKey.updateMany({
      where: { id, merchantId: merchant.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    if (revoked.count === 0) {
      return NextResponse.json({ error: 'Schlüssel nicht gefunden' }, { status: 404 })
    }

    await logAudit({ userId: merchant.id, action: 'api_key_revoked', details: { apiKeyId: id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Fehler in DELETE /api/merchant/api-keys/[id]:', error)
    return NextResponse.json({ error: 'Schlüssel konnte nicht widerrufen werden' }, { status: 500 })
  }
}
