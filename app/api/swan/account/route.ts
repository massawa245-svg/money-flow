import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { requireVerified } from '@/lib/kyc'
import {
  COUNTRIES, EMPLOYMENT_STATUSES, MONTHLY_INCOMES, SOURCES_OF_FUNDS,
  newOAuthState, swanAuthorizeUrl, swanConfigured, swanQuery, swanRedirectUri,
} from '@/lib/swan'

// ⚠️ SWAN-SANDBOX: Echtes Konto mit Test-IBAN, kein echtes Geld

const ACCOUNT_QUERY = `query($id: ID!) {
  account(accountId: $id) {
    id name IBAN BIC
    statusInfo { status }
    balances { available { value currency } booked { value currency } pending { value currency } }
    transactions(first: 10, orderBy: { field: createdAt, direction: Desc }) {
      edges { node { id label counterparty side type createdAt amount { value currency } statusInfo { status } } }
    }
  }
}`

// GET – Status des Swan-Kontos inkl. IBAN, Kontostand und letzten Umsätzen
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, include: { swanAccount: true } })
    const swan = dbUser?.swanAccount

    const base = {
      configured: swanConfigured(),
      kycStatus: dbUser?.kycStatus ?? 'NONE',
      prefill: {
        firstName: dbUser?.firstName ?? '',
        lastName: dbUser?.lastName ?? '',
        dateOfBirth: dbUser?.dateOfBirth ?? '',
      },
      options: { employmentStatuses: EMPLOYMENT_STATUSES, monthlyIncomes: MONTHLY_INCOMES, sourcesOfFunds: SOURCES_OF_FUNDS, countries: COUNTRIES },
    }

    if (!swan || swan.status !== 'OPEN' || !swan.accountId || !swanConfigured()) {
      return NextResponse.json({ ...base, status: swan?.status ?? 'NONE' })
    }

    const data = await swanQuery(ACCOUNT_QUERY, { id: swan.accountId })
    const account = data.account
    if (account?.IBAN && account.IBAN !== swan.iban) {
      await prisma.swanAccount.update({ where: { id: swan.id }, data: { iban: account.IBAN, bic: account.BIC } })
    }

    return NextResponse.json({
      ...base,
      status: 'OPEN',
      account: account && {
        name: account.name,
        iban: account.IBAN,
        bic: account.BIC,
        accountStatus: account.statusInfo?.status,
        balances: account.balances,
        transactions: (account.transactions?.edges ?? []).map((e: any) => e.node),
      },
    })
  } catch (error) {
    console.error('❌ Fehler in GET /api/swan/account:', error)
    return NextResponse.json({ error: 'Konto konnte nicht geladen werden' }, { status: 500 })
  }
}

// POST – Kontoeröffnung starten: legt den Antrag bei Swan an und liefert den Link zum Swan-Login
export async function POST(request: Request) {
  try {
    if (!swanConfigured()) return NextResponse.json({ error: 'Swan ist nicht eingerichtet' }, { status: 503 })

    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { success } = await ratelimit.limit(`swan-${user.id}`)
    if (!success) return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, include: { swanAccount: true } })
    const blocked = requireVerified(dbUser)
    if (blocked) return blocked
    if (dbUser!.swanAccount?.status === 'OPEN') {
      return NextResponse.json({ error: 'Du hast bereits ein Konto' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const error = validate(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const accountAdmin = {
      email: dbUser!.email,
      firstName: dbUser!.firstName,
      lastName: dbUser!.lastName,
      preferredLanguage: 'de',
      nationality: body.nationality,
      birthInfo: { birthDate: dbUser!.dateOfBirth, city: body.birthCity.trim(), country: body.birthCountry },
      address: {
        addressLine1: dbUser!.street,
        postalCode: dbUser!.postalCode,
        city: dbUser!.city,
        country: body.residenceCountry,
      },
      employmentStatus: body.employmentStatus,
      monthlyIncome: body.monthlyIncome,
      sourcesOfFunds: body.sourcesOfFunds,
      taxIdentificationNumber: body.taxId,
      unitedStatesTaxInfo: { isUnitedStatesPerson: false },
    }

    const created = await swanQuery(
      `mutation($input: CreateIndividualAccountHolderOnboardingInput!) {
        createIndividualAccountHolderOnboarding(input: $input) {
          ... on CreateIndividualAccountHolderOnboardingSuccessPayload {
            onboarding {
              id
              statusInfo { status ... on OnboardingInvalidStatusInfo { errors { ... on ValidationError { field details } } } }
            }
          }
        }
      }`,
      { input: { accountInfo: { country: 'DEU', name: 'Massawa Pay' }, accountAdmin } }
    )
    const onboarding = created.createIndividualAccountHolderOnboarding?.onboarding
    if (!onboarding) throw new Error('Swan-Antrag ohne Onboarding')
    if (onboarding.statusInfo.status !== 'Valid') {
      console.error('❌ Swan-Antrag ungültig:', JSON.stringify(onboarding.statusInfo))
      const fields = (onboarding.statusInfo.errors ?? []).map((e: any) => e.field).join(', ')
      return NextResponse.json({ error: `Angaben unvollständig oder ungültig${fields ? `: ${fields}` : ''}` }, { status: 400 })
    }

    const state = newOAuthState()
    await prisma.swanAccount.upsert({
      where: { userId: dbUser!.id },
      create: { userId: dbUser!.id, onboardingId: onboarding.id, oauthState: state },
      update: { onboardingId: onboarding.id, oauthState: state, status: 'ONBOARDING' },
    })

    await logAudit({ userId: dbUser!.id, action: 'SWAN_ONBOARDING_STARTED', details: { onboardingId: onboarding.id } })
      .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))

    const url = swanAuthorizeUrl({
      redirectUri: swanRedirectUri(request),
      state,
      onboardingId: onboarding.id,
      email: dbUser!.email,
      firstName: dbUser!.firstName,
      lastName: dbUser!.lastName,
      birthDate: dbUser!.dateOfBirth,
    })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('❌ Fehler in POST /api/swan/account:', error)
    return NextResponse.json({ error: 'Kontoeröffnung fehlgeschlagen' }, { status: 500 })
  }
}

function validate(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Ungültige Anfrage'
  if (!(body.employmentStatus in EMPLOYMENT_STATUSES)) return 'Bitte Berufsstatus wählen'
  if (!(body.monthlyIncome in MONTHLY_INCOMES)) return 'Bitte Einkommen wählen'
  if (!Array.isArray(body.sourcesOfFunds) || body.sourcesOfFunds.length === 0 ||
      !body.sourcesOfFunds.every((s: unknown) => typeof s === 'string' && s in SOURCES_OF_FUNDS)) {
    return 'Bitte mindestens eine Herkunft der Gelder wählen'
  }
  if (typeof body.taxId !== 'string' || !/^\d{11}$/.test(body.taxId)) return 'Die Steuer-ID hat 11 Ziffern'
  for (const key of ['nationality', 'birthCountry', 'residenceCountry']) {
    if (!(body[key] in COUNTRIES)) return 'Bitte Land wählen'
  }
  if (typeof body.birthCity !== 'string' || body.birthCity.trim().length < 2) return 'Bitte Geburtsort angeben'
  if (body.notUsPerson !== true) return 'Bitte bestätige, dass du nicht in den USA steuerpflichtig bist'
  return null
}
