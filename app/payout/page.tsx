"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/Icon"
import { formatMoney } from "@/lib/transfer-display"

// ⚠️ TESTMODUS (Chapa): Auszahlungen werden simuliert, es fließt kein echtes Geld

type Bank = { code: number; name: string; mobileMoney: boolean; accountLength: number | null }
type Account = { bankCode: number; bankName: string; accountNumber: string; accountName: string; autoPayout: boolean }
type Payout = {
  id: string
  amount: number
  currency: string
  payoutAmount: number
  bankName: string
  accountNumber: string
  accountName: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED'
  merchantPaymentId: string | null
  createdAt: string
}
type PayoutData = {
  configured: boolean
  kycStatus?: string
  isMerchant?: boolean
  balance?: number
  currency?: string
  limits?: { min: number; max: number }
  banks?: Bank[]
  account?: Account | null
  payouts?: Payout[]
}
type Quote = { amount: number; currency: string; payoutAmount: number; fee: number; rate: number }

const STATUS: Record<Payout['status'], { label: string; className: string }> = {
  SUCCESS: { label: 'Ausgezahlt', className: 'bg-green-50 text-green-700' },
  PROCESSING: { label: 'In Bearbeitung', className: 'bg-blue-50 text-blue-700' },
  FAILED: { label: 'Fehlgeschlagen', className: 'bg-red-50 text-red-700' },
}

const mask = (n: string) => `••${n.slice(-4)}`

export default function PayoutPage() {
  const router = useRouter()
  const [data, setData] = useState<PayoutData | null>(null)
  const [loadError, setLoadError] = useState("")

  const [useSaved, setUseSaved] = useState(true)
  const [bankCode, setBankCode] = useState<number | null>(null)
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [save, setSave] = useState(true)
  const [amount, setAmount] = useState("")
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<Payout | null>(null)
  const [savingAuto, setSavingAuto] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    try {
      const res = await fetch('/api/payouts')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      if (!json.account) setUseSaved(false)
      if (json.banks?.length && bankCode === null) {
        setBankCode((json.banks.find((b: Bank) => b.name.toLowerCase() === 'telebirr') ?? json.banks[0]).code)
      }
    } catch (e: any) {
      setLoadError(e.message || 'Auszahlungen konnten nicht geladen werden')
    }
  }

  // Live-Umrechnung, kurz nach der letzten Eingabe
  useEffect(() => {
    setQuote(null)
    setQuoteError("")
    const value = parseFloat(amount)
    if (!data?.configured || !value) return
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/payouts/quote?amount=${value}`)
      const json = await res.json()
      if (res.ok) setQuote(json.quote)
      else setQuoteError(json.error)
    }, 350)
    return () => clearTimeout(timer)
  }, [amount, data?.configured])

  if (!data && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const banks = data?.banks ?? []
  const wallets = banks.filter((b) => b.mobileMoney)
  const bankAccounts = banks.filter((b) => !b.mobileMoney)
  const selected = banks.find((b) => b.code === bankCode)
  const destination = useSaved && data?.account
    ? { bankCode: data.account.bankCode, accountNumber: data.account.accountNumber, accountName: data.account.accountName }
    : { bankCode, accountNumber, accountName }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), destination, save: !useSaved && save }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Auszahlung fehlgeschlagen')
        return
      }
      setDone(json.payout)
      setAmount("")
      load()
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAuto = async (autoPayout: boolean) => {
    if (!data?.account) return
    setSavingAuto(true)
    try {
      const res = await fetch('/api/payouts/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data.account, autoPayout }),
      })
      if (res.ok) setData({ ...data, account: { ...data.account, autoPayout } })
    } finally {
      setSavingAuto(false)
    }
  }

  const removeAccount = async () => {
    await fetch('/api/payouts/account', { method: 'DELETE' })
    setUseSaved(false)
    load()
  }

  const input = 'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">← Zurück zum Dashboard</Link>
          <span className="text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">Testmodus</span>
        </div>

        {/* Kopf */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-amber-500 text-white p-6 sm:p-8 shadow-xl">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-50">
              <Icon name="send" className="w-5 h-5" />
              <span className="font-semibold">Nach Äthiopien auszahlen</span>
            </div>
            <p className="text-emerald-50 text-sm mt-6">Verfügbares Guthaben</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">
              {data?.balance !== undefined ? formatMoney(data.balance, data.currency) : '–'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5 text-sm">
              {['telebirr', 'M-Pesa', 'CBE Birr', 'Bankkonto'].map((f) => (
                <span key={f} className="bg-white/20 px-3 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {loadError && <p className="text-red-600">{loadError}</p>}

        {data && !data.configured && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">
            Auszahlungen nach Äthiopien sind noch nicht eingerichtet.
          </div>
        )}

        {data?.configured && data.kycStatus !== 'APPROVED' && (
          <Link href="/verify" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Icon name="shield" className="w-6 h-6 shrink-0" />
            <span className="flex-1 font-semibold">Bestätige zuerst deine Identität, um auszuzahlen.</span>
            <span className="font-semibold whitespace-nowrap">Jetzt bestätigen →</span>
          </Link>
        )}

        {done && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <Icon name="check" className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold">
                {done.payoutAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} ETB an {done.bankName} {mask(done.accountNumber)} gesendet
              </p>
              <p className="text-sm opacity-80">{done.accountName} · {formatMoney(done.amount, done.currency)} von deinem Guthaben</p>
            </div>
          </div>
        )}

        {data?.configured && data.kycStatus === 'APPROVED' && (
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
            <h2 className="font-semibold text-gray-900">Empfänger</h2>

            {data.account && useSaved ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
                <div>
                  <p className="font-semibold text-gray-900">{data.account.accountName}</p>
                  <p className="text-sm text-gray-600">{data.account.bankName} · {data.account.accountNumber}</p>
                </div>
                <button type="button" onClick={() => setUseSaved(false)} className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap">
                  Anderes Konto
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">Mobile Wallet</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {wallets.map((w) => (
                      <button
                        key={w.code}
                        type="button"
                        onClick={() => setBankCode(w.code)}
                        className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
                          bankCode === w.code ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">oder Bankkonto</span>
                  <select
                    className={input}
                    value={selected && !selected.mobileMoney ? bankCode ?? '' : ''}
                    onChange={(e) => e.target.value && setBankCode(Number(e.target.value))}
                  >
                    <option value="">Bank wählen …</option>
                    {bankAccounts.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      {selected?.mobileMoney ? 'Handynummer' : 'Kontonummer'}
                    </span>
                    <input
                      className={input}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, selected?.accountLength ?? 20))}
                      placeholder={selected?.mobileMoney ? '09xxxxxxxx' : selected?.accountLength ? `${selected.accountLength} Ziffern` : ''}
                      inputMode="numeric"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Name des Empfängers</span>
                    <input className={input} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="z. B. Abebe Kebede" required />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="w-4 h-4" checked={save} onChange={(e) => setSave(e.target.checked)} />
                  Als mein Auszahlungskonto speichern
                </label>
                {data.account && (
                  <button type="button" onClick={() => setUseSaved(true)} className="text-sm text-blue-600 hover:text-blue-800">
                    ← Gespeichertes Konto verwenden
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag ({data.currency})</label>
              <input
                type="number"
                className={`${input} text-2xl font-bold`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={data.limits?.min}
                max={data.limits?.max}
                step="0.01"
                required
              />
              {quote && (
                <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm space-y-1">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600">Empfänger erhält</span>
                    <span className="font-bold text-emerald-700">{quote.payoutAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} ETB</span>
                  </div>
                  {quote.currency !== 'ETB' && (
                    <>
                      <div className="flex justify-between text-gray-500">
                        <span>Kurs</span>
                        <span>1 {quote.currency} = {quote.rate.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ETB</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Gebühr</span>
                        <span>{formatMoney(quote.fee, quote.currency)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              {quoteError && <p className="text-sm text-red-600 mt-2">{quoteError}</p>}
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !quote}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitting ? 'Wird ausgezahlt …' : 'Jetzt auszahlen'}
            </button>
          </form>
        )}

        {/* Händler: Sofortauszahlung */}
        {data?.configured && data.isMerchant && data.kycStatus === 'APPROVED' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Icon name="store" className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">Sofortauszahlung für deine Kasse</h2>
                <p className="text-sm text-gray-600">
                  Jede bezahlte QR-Zahlung geht automatisch direkt auf dein Auszahlungskonto.
                </p>
              </div>
            </div>
            {data.account ? (
              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-sm text-gray-700">{data.account.bankName} · {mask(data.account.accountNumber)}</span>
                <button
                  type="button"
                  onClick={() => toggleAuto(!data.account!.autoPayout)}
                  disabled={savingAuto}
                  role="switch"
                  aria-checked={data.account.autoPayout}
                  className={`relative w-12 h-7 rounded-full transition ${data.account.autoPayout ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${data.account.autoPayout ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 pt-2">Speichere zuerst ein Auszahlungskonto (oben bei der ersten Auszahlung).</p>
            )}
            {data.account && (
              <button type="button" onClick={removeAccount} className="text-xs text-gray-500 hover:text-red-600">
                Gespeichertes Konto entfernen
              </button>
            )}
          </div>
        )}

        {/* Verlauf */}
        {data?.configured && (data.payouts?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <h2 className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Letzte Auszahlungen</h2>
            <div className="divide-y divide-gray-100">
              {data.payouts!.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.accountName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(p.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} · {p.bankName} {mask(p.accountNumber)}
                      {p.merchantPaymentId && ' · Sofortauszahlung'}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="font-bold text-gray-900">{p.payoutAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} ETB</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
