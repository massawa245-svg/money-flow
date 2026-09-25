import { getAuthenticatedUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isCurrency, quoteExchange } from '@/lib/fx'

// GET /api/fx/quote?from=EUR&to=ETB&amount=100 - Kurs und Betrag vor dem Wechsel anzeigen
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const params = new URL(request.url).searchParams
    const from = params.get('from')
    const to = params.get('to')
    const amount = Number(params.get('amount'))
    if (!isCurrency(from) || !isCurrency(to)) {
      return NextResponse.json({ error: 'Nicht unterstützte Währung' }, { status: 400 })
    }

    const quote = await quoteExchange(from, to, amount)
    return NextResponse.json({ success: true, quote })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Kurs nicht verfügbar' }, { status: 400 })
  }
}
