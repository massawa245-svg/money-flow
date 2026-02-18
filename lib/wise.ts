import { NextResponse } from 'next/server'

export class WiseService {
  private apiToken: string
  private baseUrl = 'https://api.wise.com/v3'

  constructor() {
    this.apiToken = process.env.WISE_API_TOKEN!
  }

  // 🔥 Authenticated Quote (vereinfacht für deine App)
  async createAuthenticatedQuote(
    amount: number,
    targetCurrency: string = 'GBP'
  ) {
    const payload = {
      sourceCurrency: 'EUR',
      targetCurrency: targetCurrency,
      sourceAmount: amount
    }

    const response = await fetch(`${this.baseUrl}/profiles/${process.env.WISE_PROFILE_ID}/quotes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Wise API Fehler: ${error}`)
    }
    
    return response.json()
  }

  // 📝 Empfänger erstellen (für Auszahlungen)
  async createRecipient(profileId: string, recipientData: any) {
    const response = await fetch(`${this.baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: profileId,
        ...recipientData
      })
    })
    return response.json()
  }

  // 💸 Transfer erstellen
  async createTransfer(quoteId: string, targetAccountId: string, reference: string) {
    const response = await fetch(`${this.baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteUuid: quoteId,
        targetAccount: targetAccountId,
        customerTransactionId: crypto.randomUUID(),
        details: {
          reference: reference
        }
      })
    })
    return response.json()
  }

  // 💰 Transfer finanzieren (Geld senden)
  async fundTransfer(profileId: string, transferId: string) {
    const response = await fetch(`${this.baseUrl}/profiles/${profileId}/transfers/${transferId}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'BALANCE'
      })
    })
    return response.json()
  }
}