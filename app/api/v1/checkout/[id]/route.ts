import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-keys'
import { apiError, serializeCheckout } from '@/lib/checkout'
import { NextResponse } from 'next/server'

// GET /api/v1/checkout/{id} - Händler prüft, ob bezahlt wurde
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateApiKey(request)
    if (!auth) {
      return apiError(401, 'authentication_error', 'Ungültiger oder fehlender API-Schlüssel')
    }

    const { id } = await params
    const payment = await prisma.merchantPayment.findUnique({ where: { id } })
    if (!payment || payment.merchantId !== auth.merchant.id || payment.source !== 'CHECKOUT') {
      return apiError(404, 'invalid_request_error', 'Checkout nicht gefunden')
    }

    if (payment.status === 'PENDING' && payment.expiresAt < new Date()) {
      await prisma.merchantPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'EXPIRED' }
      })
      payment.status = 'EXPIRED'
    }

    return NextResponse.json(serializeCheckout(payment, new URL(request.url).origin))
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/v1/checkout/[id]:', error)
    return apiError(500, 'api_error', 'Interner Fehler')
  }
}
