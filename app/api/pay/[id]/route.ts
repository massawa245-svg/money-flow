import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Kunden-App lädt die Zahlungsdetails, nachdem der QR-Code gescannt wurde
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const payment = await prisma.merchantPayment.findUnique({
      where: { id },
      include: { merchant: { select: { name: true, email: true } } }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Zahlung nicht gefunden' }, { status: 404 })
    }

    if (payment.status === 'PENDING' && payment.expiresAt < new Date()) {
      payment.status = 'EXPIRED'
      await prisma.merchantPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'EXPIRED' }
      })
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.reference,
        merchantName: payment.merchant.name || payment.merchant.email,
        expiresAt: payment.expiresAt,
        // Nur für Online-Checkouts: Rücksprung zum Shop
        successUrl: payment.successUrl,
        cancelUrl: payment.cancelUrl
      }
    })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/pay/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
