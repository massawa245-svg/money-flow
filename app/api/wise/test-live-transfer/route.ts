import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PROFILE_ID = '84203737' // Deine Profile ID
const WISE_API_TOKEN = process.env.WISE_API_TOKEN!

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { amount, recipientAccount } = await request.json()

    // 1 Quote erstellen
    console.log(' Erstelle Quote für', amount, 'EUR...')
    const quoteResponse = await fetch(`https://api.wise.com/v3/profiles/${PROFILE_ID}/quotes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceCurrency: 'EUR',
        targetCurrency: 'EUR',
        sourceAmount: amount
      })
    })

    if (!quoteResponse.ok) {
      const error = await quoteResponse.text()
      throw new Error(`Quote Fehler: ${error}`)
    }

    const quote = await quoteResponse.json()
    console.log(' Quote erstellt:', quote.id)

    // 2 Transfer erstellen
    console.log(' Erstelle Transfer...')
    const transferResponse = await fetch(`https://api.wise.com/v1/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteUuid: quote.id,
        targetAccount: parseInt(process.env.WISE_ACCOUNT_ID!),
        customerTransactionId: crypto.randomUUID(),
        details: {
          reference: `Live Test ${amount}`
        }
      })
    })

    if (!transferResponse.ok) {
      const error = await transferResponse.text()
      throw new Error(`Transfer Fehler: ${error}`)
    }

    const transfer = await transferResponse.json()
    console.log(' Transfer erstellt:', transfer.id)

    // 3 Transfer finanzieren
    console.log(' Finanziere Transfer...')
    const fundResponse = await fetch(`https://api.wise.com/v3/profiles/${PROFILE_ID}/transfers/${transfer.id}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'BALANCE'
      })
    })

    if (!fundResponse.ok) {
      const error = await fundResponse.text()
      throw new Error(`Funding Fehler: ${error}`)
    }

    const fund = await fundResponse.json()
    console.log('✅ Transfer finanziert!')

    return NextResponse.json({
      success: true,
      message: '✅ Live Transfer erfolgreich!',
      quote: {
        id: quote.id,
        rate: quote.rate,
        fee: quote.paymentOptions[0]?.fee?.total || 0
      },
      transfer: {
        id: transfer.id,
        status: transfer.status,
        amount: transfer.sourceAmount
      },
      fund: {
        status: fund.status,
        message: 'Geld wurde überwiesen'
      }
    })

  } catch (error: any) {
    console.error('❌ Fehler:', error)
    return NextResponse.json(
      { error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}
