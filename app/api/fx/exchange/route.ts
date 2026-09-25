import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { requireVerified } from '@/lib/kyc'
import { isCurrency, quoteExchange } from '@/lib/fx'
import { credit, debit, getBalances } from '@/lib/balances'
import { logAudit } from '@/lib/audit'

// Weicht der Kurs beim Ausführen stärker ab als angezeigt, muss der Kunde neu bestätigen
const MAX_DEVIATION = 0.005

// POST /api/fx/exchange - Geld zwischen eigenen Währungen wechseln (Testmodus)
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { success } = await ratelimit.limit(`fx-${user.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const { from, to, amount, expectedToAmount } = await request.json().catch(() => ({}))
    if (!isCurrency(from) || !isCurrency(to)) {
      return NextResponse.json({ error: 'Nicht unterstützte Währung' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const blocked = requireVerified(dbUser)
    if (blocked || !dbUser) return blocked!

    let quote
    try {
      quote = await quoteExchange(from, to, Number(amount))
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    if (typeof expectedToAmount === 'number' && expectedToAmount > 0) {
      const deviation = Math.abs(quote.toAmount - expectedToAmount) / expectedToAmount
      if (deviation > MAX_DEVIATION) {
        return NextResponse.json(
          { error: 'Der Kurs hat sich geändert. Bitte prüfe den neuen Betrag.', code: 'RATE_CHANGED', quote },
          { status: 409 }
        )
      }
    }

    const exchange = await prisma.$transaction(async (tx) => {
      if (!(await debit(tx, dbUser, from, quote.fromAmount))) throw new Error('INSUFFICIENT_FUNDS')
      await credit(tx, dbUser, to, quote.toAmount)
      return tx.currencyExchange.create({
        data: {
          userId: dbUser.id,
          fromCurrency: from,
          toCurrency: to,
          fromAmount: quote.fromAmount,
          toAmount: quote.toAmount,
          marketRate: quote.marketRate,
          rate: quote.rate,
          fee: quote.fee
        }
      })
    }).catch((error) => {
      if (error.message === 'INSUFFICIENT_FUNDS') return null
      throw error
    })

    if (!exchange) {
      return NextResponse.json({ error: `Nicht genügend Guthaben in ${from}` }, { status: 400 })
    }

    await logAudit({
      userId: dbUser.id,
      action: 'fx_exchange',
      details: { exchangeId: exchange.id, from, to, fromAmount: exchange.fromAmount, toAmount: exchange.toAmount }
    })

    const fresh = await prisma.user.findUnique({ where: { id: dbUser.id } })
    return NextResponse.json({ success: true, exchange, balances: await getBalances(fresh!) })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/fx/exchange:', error)
    return NextResponse.json({ error: 'Wechsel fehlgeschlagen' }, { status: 500 })
  }
}
