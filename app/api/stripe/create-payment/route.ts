import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/stripe'

const stripeService = new StripeService()

export async function POST(request: Request) {
  try {
    const { amount, userId, email } = await request.json()

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Ungültiger Betrag' },
        { status: 400 }
      )
    }

    const result = await stripeService.createPaymentIntent(amount, userId, email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    })

  } catch (error: any) {
    console.error('Stripe API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}