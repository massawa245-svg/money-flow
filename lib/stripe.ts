import Stripe from 'stripe'

export class StripeService {
  private stripe: Stripe
  private webhookSecret: string

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover', // Aktuelle Stripe API Version
    })
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  }

  // Zahlungsintent erstellen
  async createPaymentIntent(amount: number, userId: string, email: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // In Cent umrechnen
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          userEmail: email,
        },
      })

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }
    } catch (error: any) {
      console.error('Stripe PaymentIntent Error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Zahlungsstatus prüfen
  async getPaymentStatus(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        metadata: paymentIntent.metadata,
      }
    } catch (error: any) {
      console.error('Stripe Status Error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Webhook verarbeiten
  async handleWebhook(body: any, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      )

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object
          await this.handleSuccessfulPayment(paymentIntent)
          break
        
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object
          console.log('Zahlung fehlgeschlagen:', failedPayment.id)
          break
      }

      return { received: true }
    } catch (error: any) {
      console.error('Webhook Error:', error)
      return { received: false, error: error.message }
    }
  }

  // Erfolgreiche Zahlung verarbeiten
  private async handleSuccessfulPayment(paymentIntent: any) {
    const { userId, userEmail } = paymentIntent.metadata
    const amount = paymentIntent.amount / 100

    console.log(`✅ Zahlung erfolgreich: ${amount}€ für User ${userEmail}`)
    
    // Hier später: Guthaben in deiner DB erhöhen
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: { balance: { increment: amount } }
    // })
  }
}