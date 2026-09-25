import { NextResponse } from 'next/server'

// Privater Storage-Bucket für Ausweis- und Selfie-Fotos (nur Admins dürfen lesen)
export const KYC_BUCKET = 'kyc-documents'

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

// Geldbewegungen sind erst nach freigeschalteter Identitätsprüfung erlaubt.
// Liefert eine 403-Antwort, wenn das Konto noch nicht freigeschaltet ist, sonst null.
export function requireVerified(user: { kycStatus: string } | null | undefined, message?: string) {
  if (user?.kycStatus === 'APPROVED') return null
  const text =
    message ??
    (user?.kycStatus === 'PENDING'
      ? 'Dein Ausweis wird gerade geprüft. Danach kannst du Geld bewegen.'
      : 'Bitte bestätige zuerst deine Identität (Profil → Ausweis hochladen).')
  return NextResponse.json({ error: text, code: 'KYC_REQUIRED', kycStatus: user?.kycStatus ?? 'NONE' }, { status: 403 })
}

const FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'street', 'postalCode', 'city', 'country'] as const
const PATHS = ['idFrontPath', 'idBackPath', 'selfiePath'] as const

type KycInput = Record<(typeof FIELDS)[number] | (typeof PATHS)[number], string>

function isAdult(dateOfBirth: string) {
  const dob = new Date(dateOfBirth + 'T00:00:00Z')
  if (Number.isNaN(dob.getTime())) return false
  const now = new Date()
  const eighteen = new Date(Date.UTC(dob.getUTCFullYear() + 18, dob.getUTCMonth(), dob.getUTCDate()))
  return eighteen <= now && dob.getUTCFullYear() > 1900
}

// Prüft die Angaben des Kunden. Die Foto-Pfade müssen im eigenen Ordner (<auth-uid>/) liegen,
// damit niemand fremde Dokumente als seine ausgeben kann.
export function validateKycSubmission(body: any, authUid: string): { data: KycInput } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Ungültige Anfrage' }

  const data = {} as KycInput
  for (const field of FIELDS) {
    const value = typeof body[field] === 'string' ? body[field].trim() : ''
    if (!value) return { error: 'Bitte alle Felder ausfüllen' }
    if (value.length > 100) return { error: 'Eine Angabe ist zu lang' }
    data[field] = value
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth) || !isAdult(data.dateOfBirth)) {
    return { error: 'Geburtsdatum ungültig (Format JJJJ-MM-TT, mindestens 18 Jahre)' }
  }

  for (const field of PATHS) {
    const value = body[field]
    if (typeof value !== 'string' || !value.startsWith(`${authUid}/`) || value.includes('..') || value.length > 300) {
      return { error: 'Bitte Ausweis (Vorder- und Rückseite) und Selfie hochladen' }
    }
    data[field] = value
  }

  return { data }
}
