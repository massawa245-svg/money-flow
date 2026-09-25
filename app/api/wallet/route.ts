import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { requireVerified } from '@/lib/kyc'

// ⚠️ TESTMODUS: Ein- und Auszahlungen ändern nur den Kontostand in der Datenbank.
// Es fließt KEIN echtes Geld. Wird ersetzt, sobald ein regulierter Zahlungspartner angebunden ist.
const MAX_DEPOSIT = 1000
const MAX_WITHDRAWAL = 10000

const LABELS = {
  DEPOSIT: 'Einzahlung (Test)',
  WITHDRAWAL: 'Auszahlung (Test)',
} as const

// POST - Einzahlung oder Auszahlung (nur Datenbank)
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { success } = await ratelimit.limit(`wallet-${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const amount = body.amount

    if (body.type !== 'DEPOSIT' && body.type !== 'WITHDRAWAL') {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
    }
    const type: keyof typeof LABELS = body.type
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Ungültiger Betrag' }, { status: 400 })
    }
    const max = type === 'DEPOSIT' ? MAX_DEPOSIT : MAX_WITHDRAWAL
    if (amount > max) {
      return NextResponse.json(
        { error: `Maximal ${max.toLocaleString('de-DE')} pro ${type === 'DEPOSIT' ? 'Einzahlung' : 'Auszahlung'}` },
        { status: 400 }
      )
    }
    const rounded = Math.round(amount * 100) / 100

    const blocked = requireVerified(await prisma.user.findUnique({ where: { email: user.email! } }))
    if (blocked) return blocked

    const transfer = await prisma.$transaction(async (tx) => {
      let dbUser = await tx.user.findUnique({ where: { email: user.email! } })
      if (!dbUser) {
        dbUser = await tx.user.create({
          data: {
            email: user.email!,
            name: user.user_metadata?.full_name || user.email!.split('@')[0],
            balance: 1000.00,
            currency: 'EUR'
          }
        })
      }

      if (type === 'WITHDRAWAL' && dbUser.balance < rounded) {
        throw new Error('Nicht genügend Guthaben')
      }

      await tx.user.update({
        where: { id: dbUser.id },
        data: { balance: type === 'DEPOSIT' ? { increment: rounded } : { decrement: rounded } }
      })

      // Als Transfer an sich selbst gespeichert; der Status unterscheidet Ein-/Auszahlung
      return tx.transfer.create({
        data: {
          amount: rounded,
          currency: dbUser.currency,
          senderId: dbUser.id,
          recipientId: dbUser.id,
          reference: LABELS[type],
          status: type,
          completedAt: new Date()
        },
        include: {
          sender: { select: { email: true, name: true } },
          recipient: { select: { email: true, name: true } }
        }
      })
    })

    await logAudit({ userId: transfer.senderId, action: `WALLET_${type}`, details: { amount: rounded } })
      .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))

    return NextResponse.json({ success: true, transfer })
  } catch (error: any) {
    if (error?.message === 'Nicht genügend Guthaben') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('❌ Fehler in POST /api/wallet:', error)
    return NextResponse.json({ error: 'Aktion fehlgeschlagen' }, { status: 500 })
  }
}
