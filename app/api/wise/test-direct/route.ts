import { NextResponse } from 'next/server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    // Test 1: Einfacher GET auf Accounts (funktioniert)
    const accountResponse = await fetch('https://api.wise.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`
      }
    })
    results.tests.accounts = {
      status: accountResponse.status,
      ok: accountResponse.ok
    }
    
    if (accountResponse.ok) {
      const accounts = await accountResponse.json()
      results.tests.accounts.data = accounts
    }

    // Test 2: Quote mit korrekten Parametern
    const quoteResponse = await fetch('https://api.wise.com/v1/quotes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceCurrency: 'EUR',
        targetCurrency: 'GBP',
        sourceAmount: 50,
        rateType: 'FIXED'
      })
    })
    
    results.tests.quote = {
      status: quoteResponse.status,
      ok: quoteResponse.ok
    }
    
    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text()
      results.tests.quote.error = errorText
    } else {
      const quote = await quoteResponse.json()
      results.tests.quote.data = quote
    }

  } catch (error: any) {
    results.error = error.message
  }

  return NextResponse.json(results)
}
