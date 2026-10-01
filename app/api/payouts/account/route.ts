import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireVerified } from '@/lib/kyc'
import { chapaConfigured } from '@/lib/chapa'
import { validateDestination } from '@/lib/payouts'

// PUT – Auszahlungskonto speichern { bankCode, accountNumber, accountName, autoPayout }
export async function PUT(request: Request) {
  try {
    if (!chapaConfigured()) return NextResponse.json({ error: 'Auszahlungen sind nicht eingerichtet' }, { status: 503 })

    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const blocked = requireVerified(dbUser)
    if (blocked) return blocked

    const body = await request.json().catch(() => ({}))
    const checked = await validateDestination(body)
    if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })

    // Sofortauszahlung gibt es nur für Händler (nach jeder bezahlten QR-Zahlung)
    const autoPayout = body.autoPayout === true && dbUser!.role === 'MERCHANT'
    const { bankCode, bankName, accountNumber, accountName } = checked.destination
    const account = await prisma.payoutAccount.upsert({
      where: { userId: dbUser!.id },
      create: { userId: dbUser!.id, bankCode, bankName, accountNumber, accountName, autoPayout },
      update: { bankCode, bankName, accountNumber, accountName, autoPayout },
    })
    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('❌ Fehler in PUT /api/payouts/account:', error)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
  }
}

// DELETE – gespeichertes Konto entfernen (beendet auch die Sofortauszahlung)
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
  if (dbUser) await prisma.payoutAccount.deleteMany({ where: { userId: dbUser.id } })
  return NextResponse.json({ success: true })
}
