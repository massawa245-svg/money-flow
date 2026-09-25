"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/Icon"
import { formatMoney } from "@/lib/transfer-display"

const CURRENCIES = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US-Dollar" },
  { code: "ETB", label: "Äthiopischer Birr" },
] as const

type Quote = {
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  fee: number
  marketRate: number
  rate: number
  markupPercent: number
}

function formatRate(value: number) {
  return value.toLocaleString("de-DE", { maximumFractionDigits: value < 1 ? 6 : 4 })
}

export default function ExchangePage() {
  const router = useRouter()
  const [from, setFrom] = useState("EUR")
  const [to, setTo] = useState("ETB")
  const [amount, setAmount] = useState("100")
  const [quote, setQuote] = useState<Quote | null>(null)
  const [balances, setBalances] = useState<{ currency: string; amount: number }[]>([])
  const [error, setError] = useState("")
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<Quote | null>(null)

  useEffect(() => {
    fetch("/api/transfer", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) return router.push("/login?next=/exchange")
        const data = await res.json()
        if (res.ok) setBalances(data.balances || [])
      })
      .catch(() => {})
  }, [router, done])

  // Kurs nachladen, sobald sich Betrag oder Währungen ändern (kurz verzögert beim Tippen)
  useEffect(() => {
    setQuote(null)
    setError("")
    const value = parseFloat(amount.replace(",", "."))
    if (from === to || !(value > 0)) return
    setLoadingQuote(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fx/quote?from=${from}&to=${to}&amount=${value}`, { credentials: "include" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setQuote(data.quote)
      } catch (e: any) {
        setError(e.message || "Kurs nicht verfügbar")
      } finally {
        setLoadingQuote(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [from, to, amount])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const handleExchange = async () => {
    if (!quote) return
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/fx/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ from, to, amount: quote.fromAmount, expectedToAmount: quote.toAmount }),
      })
      const data = await res.json()
      if (res.status === 409 && data.quote) {
        setQuote(data.quote)
        throw new Error(data.error)
      }
      if (!res.ok) throw new Error(data.error || "Wechsel fehlgeschlagen")
      setDone(quote)
      setBalances(data.balances || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const available = balances.find((b) => b.currency === from)?.amount ?? 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 inline-block mb-6">
          ← Zurück zur Übersicht
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Icon name="exchange" className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold">Geld wechseln</h1>
          </div>

          {balances.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {balances.map((b) => (
                <span key={b.currency} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                  {formatMoney(b.amount, b.currency)}
                </span>
              ))}
            </div>
          )}

          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Icon name="check" className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Gewechselt</h2>
              <p className="text-gray-700">
                {formatMoney(done.fromAmount, done.fromCurrency)} → <strong>{formatMoney(done.toAmount, done.toCurrency)}</strong>
              </p>
              <button
                onClick={() => setDone(null)}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Weiter wechseln
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Du wechselst</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-3 border border-gray-300 rounded-lg bg-white">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Verfügbar: {formatMoney(available, from)}</p>
              </div>

              <div className="flex justify-center">
                <button onClick={swap} aria-label="Währungen tauschen" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Icon name="exchange" className="w-5 h-5 rotate-90" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Du erhältst</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-lg font-semibold">
                    {loadingQuote ? "…" : quote ? quote.toAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 }) : "–"}
                  </div>
                  <select value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-3 border border-gray-300 rounded-lg bg-white">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
              </div>

              {quote && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-600">Kurs</span><span>1 {from} = {formatRate(quote.rate)} {to}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Marktkurs</span><span>1 {from} = {formatRate(quote.marketRate)} {to}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Gebühr ({quote.markupPercent.toLocaleString("de-DE")} %)</span><span>{formatMoney(quote.fee, from)}</span></div>
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                onClick={handleExchange}
                disabled={!quote || submitting || loadingQuote}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? "Wird gewechselt..." : quote ? `${formatMoney(quote.fromAmount, from)} wechseln` : "Betrag eingeben"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Testmodus – kein echtes Geld. Kurse:{" "}
                <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">Rates By Exchange Rate API</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
