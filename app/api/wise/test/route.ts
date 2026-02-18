import { NextResponse } from 'next/server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasToken: !!process.env.WISE_API_TOKEN,
      hasAccountId: !!process.env.WISE_ACCOUNT_ID,
      tokenPrefix: process.env.WISE_API_TOKEN?.substring(0, 10) + '...'
    }
  }

  try {
    // 1. Wise API Verbindung testen
    const balanceResponse = await fetch('https://api.wise.com/v1/balances', {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    results.balanceStatus = balanceResponse.status
    
    if (balanceResponse.ok) {
      const balances = await balanceResponse.json()
      results.balances = balances
    } else {
      const error = await balanceResponse.text()
      results.balanceError = error
    }

    // 2. Account testen
    const accountResponse = await fetch('https://api.wise.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`
      }
    })

    results.accountStatus = accountResponse.status
    
    if (accountResponse.ok) {
      const accounts = await accountResponse.json()
      results.accounts = accounts
    } else {
      const error = await accountResponse.text()
      results.accountError = error
    }

  } catch (error: any) {
    results.error = {
      message: error.message,
      stack: error.stack
    }
  }

  return NextResponse.json(results)
}
