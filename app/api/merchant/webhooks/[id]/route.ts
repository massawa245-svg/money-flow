import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionMerchant } from '@/lib/merchant'
import { logAudit } from '@/lib/audit'

// DELETE - Endpoint samt Zustell-Protokoll löschen
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const merchant = await getSessionMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const deleted = await prisma.webhookEndpoint.deleteMany({ where: { id, merchantId: merchant.id } })
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Webhook nicht gefunden' }, { status: 404 })
    }

    await logAudit({ userId: merchant.id, action: 'webhook_endpoint_deleted', details: { endpointId: id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Fehler in DELETE /api/merchant/webhooks/[id]:', error)
    return NextResponse.json({ error: 'Webhook konnte nicht gelöscht werden' }, { status: 500 })
  }
}
