import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSessionAdmin } from '@/lib/merchant'
import { KYC_BUCKET } from '@/lib/kyc'

const SIGNED_URL_SECONDS = 10 * 60

// GET - Prüfungen nach Status (Standard: offene), mit kurzlebigen Links zu den Fotos
export async function GET(request: Request) {
  try {
    const session = await getSessionAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
    }

    const status = new URL(request.url).searchParams.get('status') || 'PENDING'
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { kycStatus: status, kycSubmittedAt: { not: null } },
      orderBy: { kycSubmittedAt: status === 'PENDING' ? 'asc' : 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        kycStatus: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        street: true,
        postalCode: true,
        city: true,
        country: true,
        kycIdFrontPath: true,
        kycIdBackPath: true,
        kycSelfiePath: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectReason: true
      }
    })

    // Signierte Links mit der Session des Admins; die Storage-Policy erlaubt Lesen nur für Admins
    const paths = users.flatMap((u) => [u.kycIdFrontPath, u.kycIdBackPath, u.kycSelfiePath]).filter(Boolean) as string[]
    const urlByPath = new Map<string, string>()
    if (paths.length > 0) {
      const { data, error } = await session.supabase.storage.from(KYC_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
      if (error) console.error('❌ Signierte Links fehlgeschlagen:', error)
      data?.forEach((d) => d.path && d.signedUrl && urlByPath.set(d.path, d.signedUrl))
    }

    const submissions = users.map(({ kycIdFrontPath, kycIdBackPath, kycSelfiePath, ...u }) => ({
      ...u,
      documents: {
        idFront: kycIdFrontPath ? urlByPath.get(kycIdFrontPath) ?? null : null,
        idBack: kycIdBackPath ? urlByPath.get(kycIdBackPath) ?? null : null,
        selfie: kycSelfiePath ? urlByPath.get(kycSelfiePath) ?? null : null
      }
    }))

    return NextResponse.json({ success: true, submissions })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/admin/kyc:', error)
    return NextResponse.json({ error: 'Prüfungen konnten nicht geladen werden' }, { status: 500 })
  }
}
