import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/stripe'

const stripeService = new StripeService()

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') || ''

  const result = await stripeService.handleWebhook(body, signature)

  if (!result.received) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({ received: true })
}