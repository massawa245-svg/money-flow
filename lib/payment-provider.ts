// Abstraktion für den regulierten Payment-Partner (z.B. Onafriq, Stripe).
// Die Route-Handler kennen nur dieses Interface - welcher Partner die
// eigentliche Geldbewegung durchführt, ist austauschbar.

export interface AuthorizePaymentInput {
  paymentId: string
  payerId: string
  amount: number
  currency: string
}

export interface AuthorizePaymentResult {
  success: boolean
  providerRef?: string
  failureReason?: string
}

export interface PaymentProvider {
  authorize(input: AuthorizePaymentInput): Promise<AuthorizePaymentResult>
}

// Mock-Implementierung für den MVP. Führt keine echte Geldbewegung durch,
// erlaubt aber, den kompletten QR-Flow (Status, Idempotency, Webhooks)
// end-to-end zu testen, bevor ein echter Partner angebunden ist.
class MockPaymentProvider implements PaymentProvider {
  async authorize(input: AuthorizePaymentInput): Promise<AuthorizePaymentResult> {
    return {
      success: true,
      providerRef: `mock_${input.paymentId}`
    }
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider()
