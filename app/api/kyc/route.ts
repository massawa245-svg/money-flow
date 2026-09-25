import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { validateKycSubmission } from '@/lib/kyc'
import { logAudit } from '@/lib/audit'

const PUBLIC_FIELDS = {
  kycStatus: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  street: true,
  postalCode: true,
  city: true,
  country: true,
  kycSubmittedAt: true,
  kycReviewedAt: true,
  kycRejectReason: true
} as const

// GET - Eigener Prüfstatus und Angaben (Web und App)
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const dbUser = await prisma.user.upsert({
      where: { email: user.email! },
      update: {},
      create: {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        balance: 1000.00,
        currency: 'EUR'
      },
      select: PUBLIC_FIELDS
    })

    return NextResponse.json({ success: true, kyc: dbUser })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/kyc:', error)
    return NextResponse.json({ error: 'Status konnte nicht geladen werden' }, { status: 500 })
  }
}

// POST - Angaben und hochgeladene Fotos zur Prüfung einreichen
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { success } = await ratelimit.limit(`kyc-${user.id}`)
    if (!success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })
    }

    const result = validateKycSubmission(await request.json().catch(() => null), user.id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const { idFrontPath, idBackPath, selfiePath, ...personal } = result.data

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
    }
    if (dbUser.kycStatus === 'PENDING' || dbUser.kycStatus === 'APPROVED') {
      return NextResponse.json(
        { error: dbUser.kycStatus === 'PENDING' ? 'Deine Angaben werden bereits geprüft' : 'Dein Konto ist bereits verifiziert' },
        { status: 409 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...personal,
        kycIdFrontPath: idFrontPath,
        kycIdBackPath: idBackPath,
        kycSelfiePath: selfiePath,
        kycStatus: 'PENDING',
        kycSubmittedAt: new Date(),
        kycReviewedAt: null,
        kycRejectReason: null
      },
      select: PUBLIC_FIELDS
    })

    await logAudit({ userId: dbUser.id, action: 'kyc_submitted' })

    return NextResponse.json({ success: true, kyc: updated })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/kyc:', error)
    return NextResponse.json({ error: 'Einreichen fehlgeschlagen' }, { status: 500 })
  }
}
