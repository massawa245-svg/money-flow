import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionAdmin } from '@/lib/merchant'
import { logAudit } from '@/lib/audit'

// POST - Konto freischalten oder Prüfung ablehnen (mit Begründung für den Kunden)
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getSessionAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
    }

    const { userId } = await params
    const { action, reason } = await request.json().catch(() => ({}))

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
    }
    const rejectReason = typeof reason === 'string' ? reason.trim().slice(0, 300) : ''
    if (action === 'reject' && !rejectReason) {
      return NextResponse.json({ error: 'Bitte einen Grund für die Ablehnung angeben' }, { status: 400 })
    }

    // Nur offene Prüfungen entscheiden, damit zwei Admins sich nicht überschreiben
    const updated = await prisma.user.updateMany({
      where: { id: userId, kycStatus: 'PENDING' },
      data: {
        kycStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        kycReviewedAt: new Date(),
        kycRejectReason: action === 'reject' ? rejectReason : null
      }
    })
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Keine offene Prüfung für dieses Konto' }, { status: 409 })
    }

    await logAudit({
      userId: session.admin.id,
      action: action === 'approve' ? 'kyc_approved' : 'kyc_rejected',
      details: { customerId: userId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/admin/kyc/[userId]:', error)
    return NextResponse.json({ error: 'Entscheidung fehlgeschlagen' }, { status: 500 })
  }
}
