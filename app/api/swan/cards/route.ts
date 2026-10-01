import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { swanConfigured, swanQuery } from '@/lib/swan'

// ⚠️ SWAN-SANDBOX: Massawa Card (virtuelle Mastercard) mit Testgeld.
// Karten-Aktionen laufen im Namen des Kontoinhabers (Impersonation über x-swan-user-id).
// Bestellen und Kartendaten anzeigen brauchen eine Bestätigung (SCA) auf der Swan-Seite → consentUrl.

const MONTHLY_LIMIT_EUR = '1000'

// POST { action: 'add' | 'view' | 'cancel', cardId? }
export async function POST(request: Request) {
  try {
    if (!swanConfigured()) return NextResponse.json({ error: 'Swan ist nicht eingerichtet' }, { status: 503 })

    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { success } = await ratelimit.limit(`swan-card-${user.id}`)
    if (!success) return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! }, include: { swanAccount: true } })
    const swan = dbUser?.swanAccount
    if (!swan || swan.status !== 'OPEN' || !swan.swanUserId || !swan.membershipId) {
      return NextResponse.json({ error: 'Eröffne zuerst dein Konto' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const back = `${new URL(request.url).origin}/bank`
    const asUser = { impersonateUserId: swan.swanUserId }

    if (body.action === 'add') {
      const data = await swanQuery(
        `mutation($input: AddCardInput!) {
          addCard(input: $input) {
            __typename
            ... on AddCardSuccessPayload {
              card { id statusInfo { status ... on CardConsentPendingStatusInfo { consent { consentUrl } } } }
            }
            ... on Rejection { message }
          }
        }`,
        {
          input: {
            accountMembershipId: swan.membershipId,
            name: 'Massawa Card',
            withdrawal: true,
            international: true,
            nonMainCurrencyTransactions: true,
            eCommerce: true,
            consentRedirectUrl: `${back}?card=ordered`,
            spendingLimit: { period: 'Monthly', amount: { value: MONTHLY_LIMIT_EUR, currency: 'EUR' } },
          },
        },
        asUser
      )
      const result = data.addCard
      if (result?.__typename !== 'AddCardSuccessPayload') {
        console.error('❌ Swan addCard:', result?.__typename, result?.message)
        return NextResponse.json({ error: cardError(result?.__typename, result?.message) }, { status: 400 })
      }
      await logAudit({ userId: dbUser!.id, action: 'SWAN_CARD_ADDED', details: { cardId: result.card.id } })
        .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))
      return NextResponse.json({ consentUrl: result.card.statusInfo?.consent?.consentUrl ?? null })
    }

    if (typeof body.cardId !== 'string' || !(await ownsCard(swan.membershipId, body.cardId))) {
      return NextResponse.json({ error: 'Karte nicht gefunden' }, { status: 404 })
    }

    if (body.action === 'view') {
      const data = await swanQuery(
        `mutation($input: ViewCardNumbersInput!) {
          viewCardNumbers(input: $input) {
            __typename
            ... on ViewCardNumbersSuccessPayload { consent { consentUrl } }
            ... on Rejection { message }
          }
        }`,
        { input: { cardId: body.cardId, consentRedirectUrl: back } },
        asUser
      )
      const result = data.viewCardNumbers
      if (result?.__typename !== 'ViewCardNumbersSuccessPayload') {
        console.error('❌ Swan viewCardNumbers:', result?.__typename, result?.message)
        return NextResponse.json({ error: 'Kartendaten können gerade nicht angezeigt werden' }, { status: 400 })
      }
      return NextResponse.json({ consentUrl: result.consent.consentUrl })
    }

    if (body.action === 'cancel') {
      const data = await swanQuery(
        `mutation($input: CancelCardInput!) {
          cancelCard(input: $input) { __typename ... on Rejection { message } }
        }`,
        { input: { cardId: body.cardId } },
        asUser
      )
      if (data.cancelCard?.__typename !== 'CancelCardSuccessPayload') {
        console.error('❌ Swan cancelCard:', data.cancelCard?.__typename, data.cancelCard?.message)
        return NextResponse.json({ error: 'Karte konnte nicht gekündigt werden' }, { status: 400 })
      }
      await logAudit({ userId: dbUser!.id, action: 'SWAN_CARD_CANCELED', details: { cardId: body.cardId } })
        .catch((e) => console.error('Audit-Log fehlgeschlagen:', e))
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
  } catch (error) {
    console.error('❌ Fehler in POST /api/swan/cards:', error)
    return NextResponse.json({ error: 'Karten-Aktion fehlgeschlagen' }, { status: 500 })
  }
}

// Die Karte muss zur Mitgliedschaft dieses Nutzers gehören
async function ownsCard(membershipId: string, cardId: string) {
  const data = await swanQuery(`query($id: ID!) { card(cardId: $id) { accountMembership { id } } }`, { id: cardId })
  return data.card?.accountMembership?.id === membershipId
}

function cardError(type?: string, message?: string) {
  switch (type) {
    case 'EnabledCardDesignNotFoundRejection':
      return 'Im Swan-Dashboard ist noch kein Kartendesign aktiviert (Cards → Card design).'
    case 'BadAccountStatusRejection':
      return 'Dein Konto ist noch nicht vollständig eröffnet.'
    case 'AccountMembershipNotAllowedRejection':
      return 'Für dieses Konto dürfen keine Karten bestellt werden.'
    default:
      return message || 'Karte konnte nicht bestellt werden'
  }
}
