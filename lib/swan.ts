import { randomBytes } from 'crypto'

// ⚠️ NUR SWAN-SANDBOX: Endpunkt ist fest auf die Sandbox gesetzt – Test-IBANs, Test-Karten, kein echtes Geld.
const SWAN_GRAPHQL = 'https://api.swan.io/sandbox-partner/graphql'
const SWAN_OAUTH = 'https://oauth.swan.io/oauth2'

export function swanConfigured() {
  return Boolean(process.env.SWAN_CLIENT_ID && process.env.SWAN_CLIENT_SECRET)
}

let projectToken: { token: string; expiresAt: number } | null = null

// Projekt-Token (client_credentials), gilt 1 Stunde; wird im Speicher gehalten und kurz vor Ablauf erneuert
async function getProjectToken() {
  if (projectToken && projectToken.expiresAt > Date.now() + 60_000) return projectToken.token
  const res = await fetch(`${SWAN_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SWAN_CLIENT_ID!,
      client_secret: process.env.SWAN_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Swan-Token fehlgeschlagen (${res.status})`)
  const data = await res.json()
  projectToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return projectToken.token
}

type SwanAuth = { userToken?: string; impersonateUserId?: string }

// GraphQL-Aufruf. Ohne Angabe mit Projekt-Token; `userToken` oder `impersonateUserId` handeln im Namen eines Nutzers.
export async function swanQuery<T = any>(query: string, variables?: Record<string, unknown>, auth: SwanAuth = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.userToken ?? (await getProjectToken())}`,
  }
  if (auth.impersonateUserId) headers['x-swan-user-id'] = auth.impersonateUserId

  const res = await fetch(SWAN_GRAPHQL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.errors?.length) {
    console.error('❌ Swan GraphQL:', res.status, JSON.stringify(data.errors ?? data).slice(0, 500))
    throw new Error('Swan-Anfrage fehlgeschlagen')
  }
  return data.data as T
}

export function newOAuthState() {
  return randomBytes(24).toString('hex')
}

export function swanRedirectUri(request: Request) {
  return `${new URL(request.url).origin}/api/swan/callback`
}

// Swan-Login (Handynummer + Identitätsprüfung). Mit onboardingId wird danach das Konto eröffnet.
export function swanAuthorizeUrl(params: {
  redirectUri: string
  state: string
  onboardingId: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
}) {
  const url = new URL(`${SWAN_OAUTH}/auth`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.SWAN_CLIENT_ID!)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', 'openid offline')
  url.searchParams.set('state', params.state)
  url.searchParams.set('onboardingId', params.onboardingId)
  url.searchParams.set('identificationLevel', 'Auto')
  url.searchParams.set('language', 'de')
  if (params.email) url.searchParams.set('email', params.email)
  if (params.firstName) url.searchParams.set('firstName', params.firstName)
  if (params.lastName) url.searchParams.set('lastName', params.lastName)
  if (params.birthDate) url.searchParams.set('birthDate', params.birthDate)
  return url.toString()
}

export async function exchangeSwanCode(code: string, redirectUri: string) {
  const res = await fetch(`${SWAN_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SWAN_CLIENT_ID!,
      client_secret: process.env.SWAN_CLIENT_SECRET!,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('❌ Swan-Code-Tausch:', res.status, (await res.text()).slice(0, 300))
    throw new Error('Swan-Login fehlgeschlagen')
  }
  const data = await res.json()
  return data.access_token as string
}

// Auswahllisten für das Kontoeröffnungs-Formular (Werte = Swan-Enums)
export const EMPLOYMENT_STATUSES = {
  Employee: 'Angestellt',
  Entrepreneur: 'Selbstständig / Unternehmer',
  ShopOwner: 'Ladeninhaber',
  Craftsman: 'Handwerker',
  Manager: 'Führungskraft',
  Practitioner: 'Freiberufler',
  Farmer: 'Landwirt',
  Student: 'Student',
  Retiree: 'Rentner',
  Unemployed: 'Ohne Beschäftigung',
} as const

export const MONTHLY_INCOMES = {
  LessThan500: 'unter 500 €',
  Between500And1500: '500 – 1.500 €',
  Between1500And3000: '1.500 – 3.000 €',
  Between3000And4500: '3.000 – 4.500 €',
  MoreThan4500: 'über 4.500 €',
} as const

export const SOURCES_OF_FUNDS = {
  Salary: 'Gehalt',
  SelfEmployment: 'Selbstständige Tätigkeit',
  BusinessActivity: 'Geschäftstätigkeit',
  FamilyContributions: 'Unterstützung durch Familie',
  PersonalWealth: 'Eigenes Vermögen',
  InheritanceOrGift: 'Erbschaft oder Schenkung',
  RealEstateIncome: 'Mieteinnahmen',
  CapitalGains: 'Kapitalerträge',
  SaleOfAssets: 'Verkauf von Vermögen',
  Other: 'Sonstiges',
} as const

// Länder für Wohnsitz/Nationalität (ISO 3166-1 alpha-3), die häufigsten zuerst
export const COUNTRIES = {
  DEU: 'Deutschland',
  ETH: 'Äthiopien',
  ERI: 'Eritrea',
  AUT: 'Österreich',
  CHE: 'Schweiz',
  FRA: 'Frankreich',
  ITA: 'Italien',
  NLD: 'Niederlande',
  BEL: 'Belgien',
  ESP: 'Spanien',
  SWE: 'Schweden',
  NOR: 'Norwegen',
  GBR: 'Vereinigtes Königreich',
  USA: 'USA',
  KEN: 'Kenia',
  SOM: 'Somalia',
  SDN: 'Sudan',
  UGA: 'Uganda',
  TUR: 'Türkei',
} as const
