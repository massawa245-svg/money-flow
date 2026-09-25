import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { validateMerchantPayment } from '@/lib/validator'
import { logAudit } from '@/lib/audit'
import { requireVerified } from '@/lib/kyc'

const PAYMENT_TTL_MS = 5 * 60 * 1000 // Dynamischer QR ist 5 Minuten gültig

// GET - Zahlungsanforderungen des eingeloggten Händlers auflisten
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const merchant = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!merchant || merchant.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const payments = await prisma.merchantPayment.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ success: true, payments })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/merchant/payments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Neue QR-Zahlungsanforderung an der Kasse erzeugen
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    // 🔒 RATE LIMITING
    const { success } = await ratelimit.limit(`merchant-payment-${user.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const merchant = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!merchant || merchant.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const blocked = requireVerified(merchant, 'Dein Händlerkonto ist noch nicht verifiziert. Bitte zuerst den Ausweis im Profil hochladen.')
    if (blocked) return blocked

    // 🔒 IDEMPOTENCY: Kasse muss einen eigenen Key mitschicken (z.B. lokale Transaktions-ID),
    // damit ein Retry bei Netzwerkfehler nicht zwei Zahlungsanforderungen erzeugt.
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Idempotency-Key Header fehlt' }, { status: 400 })
    }

    const existing = await prisma.merchantPayment.findUnique({ where: { idempotencyKey } })
    if (existing) {
      if (existing.merchantId !== merchant.id) {
        return NextResponse.json({ error: 'Idempotency-Key bereits von anderem Händler verwendet' }, { status: 409 })
      }
      return NextResponse.json({ success: true, payment: existing })
    }

    const { amount, currency, reference } = await request.json()

    const validationErrors = validateMerchantPayment({ amount, currency, reference })
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 })
    }

    const payment = await prisma.merchantPayment.create({
      data: {
        merchantId: merchant.id,
        amount,
        currency: currency || merchant.currency || 'ETB',
        reference: reference || '',
        idempotencyKey,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + PAYMENT_TTL_MS)
      }
    })

    await logAudit({
      userId: merchant.id,
      action: 'merchant_payment_created',
      details: { paymentId: payment.id, amount: payment.amount, currency: payment.currency }
    })

    return NextResponse.json({ success: true, payment })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/payments:', error)
    return NextResponse.json({ error: error.message || 'Zahlungsanforderung fehlgeschlagen' }, { status: 400 })
  }
}
