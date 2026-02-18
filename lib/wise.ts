export class WiseService {
  private apiToken: string
  private baseUrl = 'https://api.wise.com/v3'  // WICHTIG: v3 für Produktion!

  constructor() {
    this.apiToken = process.env.WISE_API_TOKEN!
  }

  // 🔥 Authenticated Quote (für echte Transfers) [citation:1][citation:2]
  async createAuthenticatedQuote(
    profileId: string,
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    isSourceAmount: boolean = true
  ) {
    const payload: any = {
      sourceCurrency,
      targetCurrency,
      targetAccount: null
    }

    // Entweder sourceAmount ODER targetAmount (nie beide!) [citation:1]
    if (isSourceAmount) {
      payload.sourceAmount = amount
    } else {
      payload.targetAmount = amount
    }

    const response = await fetch(`${this.baseUrl}/profiles/${profileId}/quotes`, {
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

  // 📝 Empfänger erstellen (für Auszahlungen) [citation:2]
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

  // 💸 Transfer erstellen [citation:2]
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

  // 💰 Transfer finanzieren (Geld senden) [citation:2]
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