import { WiseService } from '@/lib/wise'
import { NextResponse } from 'next/server'

const wise = new WiseService()

export async function POST(request: Request) {
  try {
    const { amount, userId, email } = await request.json()

    console.log(' Wise Payment Request:', { amount, userId, email })

    // 1. Quote erstellen (NUR sourceAmount!)
    const quote = await wise.createQuote(amount, 'GBP')
    console.log(' Quote erstellt:', quote)

    if (!quote.id) {
      return NextResponse.json(
        { error: 'Quote konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    // 2. Transfer erstellen
    const transfer = await wise.createTransfer(quote.id, userId, email)
    console.log(' Transfer erstellt:', transfer)

    return NextResponse.json({
      success: true,
      paymentUrl: `https://wise.com/transfers/${transfer.id}/fund`,
      transferId: transfer.id,
      quoteId: quote.id
    })

  } catch (error: any) {
    console.error(' Wise API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler bei der Zahlungsabwicklung' },
      { status: 500 }
    )
  }
}
