// Geldwechsel im Testmodus: echte Marktkurse, konfigurierbarer Aufschlag, Buchung nur in der Datenbank.
// Später wird getMarketRate() durch den Kurs des regulierten Partners ersetzt.

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'ETB'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

const RATES_URL = 'https://open.er-api.com/v6/latest/EUR'
const CACHE_MS = 10 * 60 * 1000
const MIN_AMOUNT = 1
const MAX_AMOUNT = 1_000_000

// Aufschlag auf den Marktkurs in Prozent (Einnahme), per Umgebungsvariable einstellbar
export function markupPercent() {
  const value = Number(process.env.FX_MARKUP_PERCENT ?? '1')
  return Number.isFinite(value) && value >= 0 && value < 10 ? value : 1
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null

async function eurRates() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.rates
  const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.result !== 'success') {
    if (cache) return cache.rates // lieber etwas älteren Kurs als gar keinen
    throw new Error('Wechselkurse sind gerade nicht verfügbar')
  }
  cache = { rates: data.rates, fetchedAt: Date.now() }
  return cache.rates
}

// Marktkurs: 1 from = x to (über EUR als Basis)
export async function getMarketRate(from: Currency, to: Currency) {
  if (from === to) return 1
  const rates = await eurRates()
  const fromPerEur = from === 'EUR' ? 1 : rates[from]
  const toPerEur = to === 'EUR' ? 1 : rates[to]
  if (!fromPerEur || !toPerEur) throw new Error(`Kein Kurs für ${from}/${to}`)
  return toPerEur / fromPerEur
}

export const round2 = (n: number) => Math.round(n * 100) / 100

export async function quoteExchange(from: Currency, to: Currency, amount: number) {
  if (from === to) throw new Error('Bitte zwei verschiedene Währungen wählen')
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    throw new Error(`Betrag muss zwischen ${MIN_AMOUNT} und ${MAX_AMOUNT.toLocaleString('de-DE')} liegen`)
  }
  const fromAmount = round2(amount)
  const marketRate = await getMarketRate(from, to)
  const fee = round2((fromAmount * markupPercent()) / 100)
  const toAmount = round2((fromAmount - fee) * marketRate)
  return {
    fromCurrency: from,
    toCurrency: to,
    fromAmount,
    toAmount,
    fee,
    marketRate,
    rate: toAmount / fromAmount, // effektiver Kurs inkl. Aufschlag
    markupPercent: markupPercent()
  }
}
