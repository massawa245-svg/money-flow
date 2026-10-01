// ⚠️ NUR CHAPA-TESTMODUS: Es werden ausschließlich Test-Keys (CHASECK_TEST-…) akzeptiert, kein echtes Geld.
// Live-Auszahlungen nach Äthiopien brauchen einen lizenzierten Partner für den Geldfluss aus Europa.
const CHAPA_API = 'https://api.chapa.co/v1'
const BANKS_CACHE_MS = 60 * 60 * 1000

export function chapaConfigured() {
  return Boolean(process.env.CHAPA_SECRET_KEY?.startsWith('CHASECK_TEST-'))
}

export type ChapaBank = { code: number; name: string; mobileMoney: boolean; accountLength: number | null }

let banksCache: { banks: ChapaBank[]; fetchedAt: number } | null = null

// Banken und Mobile Wallets (telebirr, M-Pesa, CBE Birr …), Wallets zuerst
export async function getChapaBanks(): Promise<ChapaBank[]> {
  if (banksCache && Date.now() - banksCache.fetchedAt < BANKS_CACHE_MS) return banksCache.banks
  const res = await fetch(`${CHAPA_API}/banks`, {
    headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !Array.isArray(data?.data)) {
    if (banksCache) return banksCache.banks
    throw new Error('Bankliste von Chapa nicht verfügbar')
  }
  const banks: ChapaBank[] = data.data
    .filter((b: any) => (b.currency ?? 'ETB') === 'ETB')
    .map((b: any) => ({
      code: Number(b.id),
      name: String(b.name),
      mobileMoney: b.is_mobilemoney === 1,
      accountLength: typeof b.acct_length === 'number' ? b.acct_length : null,
    }))
    .sort((a: ChapaBank, b: ChapaBank) => Number(b.mobileMoney) - Number(a.mobileMoney) || a.name.localeCompare(b.name))
  banksCache = { banks, fetchedAt: Date.now() }
  return banks
}

export async function createChapaTransfer(params: {
  accountName: string
  accountNumber: string
  amount: number
  bankCode: number
  reference: string
}) {
  const res = await fetch(`${CHAPA_API}/transfers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_name: params.accountName,
      account_number: params.accountNumber,
      amount: params.amount.toFixed(2),
      currency: 'ETB',
      reference: params.reference,
      bank_code: params.bankCode,
      status: 'success', // nur Testmodus: simuliert eine erfolgreiche Auszahlung
    }),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data?.status === 'success', status: res.status, message: chapaMessage(data?.message) }
}

// Chapa liefert Fehler mal als Text, mal als { feld: ["Meldung"] }
function chapaMessage(message: unknown): string {
  if (typeof message === 'string') return message
  if (message && typeof message === 'object') {
    return Object.entries(message as Record<string, unknown>)
      .map(([field, v]) => `${field}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join('; ')
  }
  return ''
}
