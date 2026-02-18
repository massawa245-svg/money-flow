import { NextResponse } from 'next/server'
import { WiseService } from '@/lib/wise'
import { createClient } from '@/lib/supabase/server'

const wise = new WiseService()
const PROFILE_ID = '84203737'  // Deine Profile ID

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { amount, recipientDetails } = await request.json()

    // 1️⃣ Authenticated Quote erstellen [citation:1]
    const quote = await wise.createAuthenticatedQuote(
      PROFILE_ID,
      'EUR',
      'EUR',  // Für jetzt: gleiche Währung
      amount,
      true
    )

    console.log('✅ Quote erstellt:', quote.id)

    // 2️⃣ Quote enthält wichtige Infos: [citation:1]
    // - rate: Wechselkurs
    // - fee.total: Gebühren
    // - estimatedDelivery: Voraussichtliche Lieferung

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      rate: quote.rate,
      fee: quote.paymentOptions[0]?.fee?.total || 0,
      estimatedDelivery: quote.paymentOptions[0]?.formattedEstimatedDelivery
    })

  } catch (error: any) {
    console.error('Wise Live Error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler bei Wise' },
      { status: 500 }
    )
  }
}