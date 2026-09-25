import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    // Webhook-Signatur verifizieren
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Zahlung erfolgreich
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const { userId, userEmail } = paymentIntent.metadata
      const amount = paymentIntent.amount / 100

      console.log(`💰 Zahlung erhalten: ${amount}€ von ${userEmail}`)

      // Guthaben in der Datenbank erhöhen
      await prisma.user.update({
        where: { email: userEmail },
        data: { balance: { increment: amount } }
      })

      console.log(`✅ Guthaben aktualisiert für ${userEmail}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json(
      { error: 'Webhook Error' },
      { status: 400 }
    )
  }
}