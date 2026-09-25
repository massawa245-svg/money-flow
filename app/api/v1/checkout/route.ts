import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey } from '@/lib/api-keys'
import { apiError, isAllowedRedirectUrl, serializeCheckout } from '@/lib/checkout'
import { ratelimit } from '@/lib/rate-limit'
import { validateMerchantPayment } from '@/lib/validator'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

const CHECKOUT_TTL_MS = 30 * 60 * 1000 // Checkout-Link ist 30 Minuten gültig

// POST /api/v1/checkout - Händler-Server erzeugt eine Checkout-Sitzung und leitet den Kunden auf "url"
export async function POST(request: Request) {
  try {
    const auth = await authenticateApiKey(request)
    if (!auth) {
      return apiError(401, 'authentication_error', 'Ungültiger oder fehlender API-Schlüssel')
    }
    const { merchant, apiKey } = auth

    const { success } = await ratelimit.limit(`api-checkout-${apiKey.id}`)
    if (!success) {
      return apiError(429, 'rate_limit_error', 'Zu viele Anfragen. Bitte warte einen Moment.')
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return apiError(400, 'invalid_request_error', 'Body muss gültiges JSON sein')
    }

    const { amount, currency, reference, success_url, cancel_url } = body

    const validationErrors = validateMerchantPayment({ amount, reference })
    if (typeof amount !== 'number' || validationErrors.length > 0) {
      return apiError(400, 'invalid_request_error', validationErrors.join(', ') || 'Ungültiger Betrag')
    }
    // Keine Währungsumrechnung: bezahlt wird immer in der Kontowährung des Händlers
    if (currency !== undefined && currency !== merchant.currency) {
      return apiError(400, 'invalid_request_error', `Währung muss ${merchant.currency} sein`)
    }
    for (const [field, value] of [['success_url', success_url], ['cancel_url', cancel_url]] as const) {
      if (value !== undefined && !isAllowedRedirectUrl(value)) {
        return apiError(400, 'invalid_request_error', `${field} muss eine https-Adresse sein`)
      }
    }

    // Idempotency-Key ist optional; pro Händler eindeutig, damit sich Händler nicht in die Quere kommen
    const clientKey = request.headers.get('Idempotency-Key')
    const idempotencyKey = `api:${merchant.id}:${clientKey || randomUUID()}`
    const origin = new URL(request.url).origin

    const existing = await prisma.merchantPayment.findUnique({ where: { idempotencyKey } })
    if (existing) {
      return NextResponse.json(serializeCheckout(existing, origin))
    }

    const payment = await prisma.merchantPayment.create({
      data: {
        merchantId: merchant.id,
        amount: Math.round(amount * 100) / 100,
        currency: merchant.currency,
        reference: typeof reference === 'string' ? reference : '',
        source: 'CHECKOUT',
        successUrl: success_url ?? null,
        cancelUrl: cancel_url ?? null,
        idempotencyKey,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS)
      }
    })

    await logAudit({
      userId: merchant.id,
      action: 'checkout_created',
      details: { paymentId: payment.id, apiKeyId: apiKey.id, amount: payment.amount }
    })

    return NextResponse.json(serializeCheckout(payment, origin), { status: 201 })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/v1/checkout:', error)
    return apiError(500, 'api_error', 'Interner Fehler')
  }
}
