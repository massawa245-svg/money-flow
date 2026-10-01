import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { requireVerified } from '@/lib/kyc'
import { chapaConfigured, getChapaBanks } from '@/lib/chapa'
import { executePayout, MAX_PAYOUT, MIN_PAYOUT, validateDestination } from '@/lib/payouts'

// ⚠️ TESTMODUS (Chapa): Auszahlung nach Äthiopien an telebirr, M-Pesa, CBE Birr oder Bankkonto

// GET – Banken, gespeichertes Konto, Guthaben und letzte Auszahlungen
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, include: { payoutAccount: true } })
    if (!dbUser) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })

    if (!chapaConfigured()) return NextResponse.json({ configured: false })

    const [banks, payouts] = await Promise.all([
      getChapaBanks(),
      prisma.payout.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])

    return NextResponse.json({
      configured: true,
      kycStatus: dbUser.kycStatus,
      isMerchant: dbUser.role === 'MERCHANT',
      balance: dbUser.balance,
      currency: dbUser.currency,
      limits: { min: MIN_PAYOUT, max: MAX_PAYOUT },
      banks,
      account: dbUser.payoutAccount,
      payouts,
    })
  } catch (error) {
    console.error('❌ Fehler in GET /api/payouts:', error)
    return NextResponse.json({ error: 'Auszahlungen konnten nicht geladen werden' }, { status: 500 })
  }
}

// POST – neue Auszahlung { amount, destination: { bankCode, accountNumber, accountName }, save? }
export async function POST(request: Request) {
  try {
    if (!chapaConfigured()) return NextResponse.json({ error: 'Auszahlungen sind nicht eingerichtet' }, { status: 503 })

    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { success } = await ratelimit.limit(`payout-${user.id}`)
    if (!success) return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const blocked = requireVerified(dbUser)
    if (blocked) return blocked

    const body = await request.json().catch(() => ({}))
    const checked = await validateDestination(body.destination)
    if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })

    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount < MIN_PAYOUT || amount > MAX_PAYOUT) {
      return NextResponse.json({ error: `Betrag muss zwischen ${MIN_PAYOUT} und ${MAX_PAYOUT.toLocaleString('de-DE')} liegen` }, { status: 400 })
    }

    if (body.save === true) {
      const { bankCode, bankName, accountNumber, accountName } = checked.destination
      await prisma.payoutAccount.upsert({
        where: { userId: dbUser!.id },
        create: { userId: dbUser!.id, bankCode, bankName, accountNumber, accountName },
        update: { bankCode, bankName, accountNumber, accountName },
      })
    }

    const payout = await executePayout({ userId: dbUser!.id, amount, destination: checked.destination })
    if (payout.status === 'FAILED') {
      return NextResponse.json({ error: 'Auszahlung abgelehnt – dein Guthaben wurde zurückgebucht', payout }, { status: 502 })
    }
    return NextResponse.json({ success: true, payout })
  } catch (error: any) {
    if (error?.message === 'Nicht genügend Guthaben') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('❌ Fehler in POST /api/payouts:', error)
    return NextResponse.json({ error: 'Auszahlung fehlgeschlagen' }, { status: 500 })
  }
}
