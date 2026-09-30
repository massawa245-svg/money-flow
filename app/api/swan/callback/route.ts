import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { exchangeSwanCode, swanConfigured, swanQuery, swanRedirectUri } from '@/lib/swan'

// ⚠️ SWAN-SANDBOX: Rücksprung nach dem Swan-Login. Tauscht den Code gegen ein Nutzer-Token
// und schließt damit die Kontoeröffnung ab (finalizeAccountHolderOnboarding braucht ein Nutzer-Token).

const ONBOARDING_ACCOUNT = `
  ... on IndividualAccountHolderOnboarding {
    account { id IBAN BIC legalRepresentativeMembership { id } }
  }`

export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (query: string) => NextResponse.redirect(new URL(`/bank?${query}`, url.origin))

  try {
    if (!swanConfigured()) return back('error=config')

    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.redirect(new URL('/login', url.origin))

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, include: { swanAccount: true } })
    const swan = dbUser?.swanAccount
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (url.searchParams.get('error')) return back('error=cancelled')
    if (!swan || !code || !state || !swan.oauthState || state !== swan.oauthState) return back('error=state')
    if (swan.status === 'OPEN') return back('opened=1')

    const userToken = await exchangeSwanCode(code, swanRedirectUri(request))
    const me = await swanQuery(`{ user { id } }`, undefined, { userToken })

    const finalized = await swanQuery(
      `mutation($input: FinalizeAccountHolderOnboardingInput!) {
        finalizeAccountHolderOnboarding(input: $input) {
          __typename
          ... on FinalizeAccountHolderOnboardingSuccessPayload { onboarding { ${ONBOARDING_ACCOUNT} } }
          ... on Rejection { message }
        }
      }`,
      { input: { onboardingId: swan.onboardingId } },
      { userToken }
    )
    const result = finalized.finalizeAccountHolderOnboarding
    let account = result?.onboarding?.account

    // Schon abgeschlossen (z. B. doppelter Aufruf): Konto über das Projekt-Token nachladen
    if (!account && result?.__typename === 'OnboardingAlreadyFinalizedRejection') {
      const data = await swanQuery(
        `query($id: ID!) { accountHolderOnboarding(id: $id) { ${ONBOARDING_ACCOUNT} } }`,
        { id: swan.onboardingId }
      )
      account = data.accountHolderOnboarding?.account
    }
    if (!account) {
      console.error('❌ Swan finalize:', result?.__typename, result?.message)
      return back('error=finalize')
    }

    await prisma.swanAccount.update({
      where: { id: swan.id },
      data: {
        status: 'OPEN',
        oauthState: null,
        swanUserId: me.user?.id ?? null,
        accountId: account.id,
        membershipId: account.legalRepresentativeMembership?.id ?? null,
        iban: account.IBAN ?? null,
        bic: account.BIC ?? null,
      },
    })

    await logAudit({ userId: dbUser!.id, action: 'SWAN_ACCOUNT_OPENED', details: { accountId: account.id } })
      .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))

    return back('opened=1')
  } catch (error) {
    console.error('❌ Fehler in GET /api/swan/callback:', error)
    return back('error=server')
  }
}
