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

    // 1️⃣ Quote erstellen (wie wir erfolgreich getestet haben)
    const quoteResponse = await fetch(`https://api.wise.com/v3/profiles/${PROFILE_ID}/quotes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceCurrency: 'EUR',
        targetCurrency: 'EUR',  // Für Test: gleiche Währung
        sourceAmount: amount
      })
    })

    const quote = await quoteResponse.json()
    console.log('✅ Quote:', quote)

    // 2️⃣ Empfänger erstellen (z.B. dein eigenes Bankkonto)
    const recipientResponse = await fetch(`https://api.wise.com/v1/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: PROFILE_ID,
        accountHolderName: "Dein Name",
        currency: "EUR",
        type: "iban",
        details: {
          IBAN: "DE1234567890..." // Deine IBAN
        }
      })
    })

    const recipient = await recipientResponse.json()
    console.log('✅ Recipient:', recipient)

    // 3️⃣ Transfer erstellen
    const transferResponse = await fetch(`https://api.wise.com/v1/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteUuid: quote.id,
        targetAccount: recipient.id,
        customerTransactionId: crypto.randomUUID(),
        details: {
          reference: `Live Test ${amount}€`
        }
      })
    })

    const transfer = await transferResponse.json()
    console.log('✅ Transfer:', transfer)

    // 4️⃣ Transfer finanzieren (Geld senden)
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

    const fund = await fundResponse.json()
    console.log('✅ Funded:', fund)

    return NextResponse.json({
      success: true,
      quote,
      recipient,
      transfer,
      fund,
      message: '✅ Transfer erfolgreich!'
    })

  } catch (error: any) {
    console.error('❌ Fehler:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}