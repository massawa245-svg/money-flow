import type { MerchantPayment } from '@prisma/client'
import { NextResponse } from 'next/server'

// Einheitliches Fehlerformat der öffentlichen API
export function apiError(status: number, type: string, message: string) {
  return NextResponse.json({ error: { type, message } }, { status })
}

// Nur http(s)-Adressen als Rücksprung zum Shop; http nur für lokale Entwicklung
export function isAllowedRedirectUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  } catch {
    return false
  }
}

// Öffentliche Darstellung einer Checkout-Sitzung (Stripe-ähnliches snake_case)
export function serializeCheckout(payment: MerchantPayment, origin: string) {
  return {
    id: payment.id,
    object: 'checkout',
    url: `${origin}/pay/${payment.id}`,
    status: payment.status.toLowerCase(),
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference || null,
    success_url: payment.successUrl,
    cancel_url: payment.cancelUrl,
    livemode: false,
    created_at: payment.createdAt.toISOString(),
    expires_at: payment.expiresAt.toISOString(),
    completed_at: payment.completedAt?.toISOString() ?? null
  }
}
