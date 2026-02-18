import { WiseService } from '@/lib/wise'
import { NextResponse } from 'next/server'

const wise = new WiseService()

export async function GET() {
  try {
    const balance = await wise.getBalance()
    return NextResponse.json({ success: true, balance })
  } catch (error) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { amount, currency } = await request.json()
    const quote = await wise.createQuote(amount, currency)
    return NextResponse.json({ success: true, quote })
  } catch (error) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}