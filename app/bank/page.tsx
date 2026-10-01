"use client"
import { Suspense, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/Icon"
import { formatMoney } from "@/lib/transfer-display"
import { MassawaCard } from "@/components/MassawaCard"

// ⚠️ SWAN-SANDBOX: Echtes Konto mit Test-IBAN und Test-Geld – kein echtes Geld

type Options = Record<'employmentStatuses' | 'monthlyIncomes' | 'sourcesOfFunds' | 'countries', Record<string, string>>

type SwanTransaction = {
  id: string
  label: string
  counterparty: string
  side: 'Debit' | 'Credit'
  createdAt: string
  amount: { value: string; currency: string }
  statusInfo: { status: string }
}

type SwanCard = {
  id: string
  name: string | null
  type: string
  maskedNumber: string
  expiryDate: string | null
  status: 'ConsentPending' | 'Processing' | 'Enabled'
  consentUrl: string | null
}

type BankData = {
  configured: boolean
  kycStatus: string
  status: 'NONE' | 'ONBOARDING' | 'OPEN'
  prefill: { firstName: string; lastName: string; dateOfBirth: string }
  options: Options
  account?: {
    name: string
    iban: string | null
    bic: string
    accountStatus: string
    balances: Record<'available' | 'booked' | 'pending', { value: string; currency: string }> | null
    transactions: SwanTransaction[]
    holderName: string | null
    cards: SwanCard[]
  }
}

const ERRORS: Record<string, string> = {
  cancelled: 'Die Anmeldung bei Swan wurde abgebrochen.',
  state: 'Die Anmeldung ist abgelaufen. Bitte starte die Kontoeröffnung erneut.',
  finalize: 'Swan konnte das Konto noch nicht eröffnen. Bitte versuche es erneut.',
  config: 'Swan ist noch nicht eingerichtet.',
  server: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
}

function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

export default function BankPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Bank />
    </Suspense>
  )
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

function Bank() {
  const [data, setData] = useState<BankData | null>(null)
  const [loadError, setLoadError] = useState("")
  const router = useRouter()
  const params = useSearchParams()

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
      const res = await fetch('/api/swan/account')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setLoadError(e.message || 'Konto konnte nicht geladen werden')
    }
  }

  if (!data && !loadError) return <Spinner />

  const errorKey = params.get('error')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Zurück zum Dashboard
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
            Sandbox
          </span>
        </div>

        {params.get('opened') && data?.status === 'OPEN' && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <Icon name="check" className="w-6 h-6 shrink-0" />
            <span className="font-semibold">Dein Konto ist eröffnet – deine IBAN ist bereit.</span>
          </div>
        )}
        {params.get('card') === 'ordered' && data?.status === 'OPEN' && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <Icon name="check" className="w-6 h-6 shrink-0" />
            <span className="font-semibold">Deine Massawa Card ist bestellt.</span>
          </div>
        )}
        {errorKey && data?.status !== 'OPEN' && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <Icon name="alert" className="w-6 h-6 shrink-0" />
            <span>{ERRORS[errorKey] ?? ERRORS.server}</span>
          </div>
        )}

        {loadError && <p className="text-red-600">{loadError}</p>}

        {data && !data.configured && (
          <Notice icon="info" title="Bankkonto kommt bald" text="Die Anbindung an unseren Bankpartner ist noch nicht eingerichtet." />
        )}

        {data?.configured && data.kycStatus !== 'APPROVED' && data.status !== 'OPEN' && (
          <Notice
            icon="shield"
            title="Zuerst Identität bestätigen"
            text="Bevor du ein Bankkonto eröffnen kannst, muss dein Ausweis geprüft sein."
            href="/verify"
            cta="Jetzt bestätigen →"
          />
        )}

        {data?.configured && data.kycStatus === 'APPROVED' && data.status !== 'OPEN' && (
          <OpenAccount data={data} />
        )}

        {data?.status === 'OPEN' && data.account && <AccountView account={data.account} onRefresh={load} />}
      </div>
    </div>
  )
}

function Notice({ icon, title, text, href, cta }: { icon: 'info' | 'shield'; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
        <Icon name={icon} className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600">{text}</p>
      {href && (
        <Link href={href} className="inline-block mt-5 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
          {cta}
        </Link>
      )}
    </div>
  )
}

function AccountView({ account, onRefresh }: { account: NonNullable<BankData['account']>; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false)
  const available = account.balances?.available

  const copyIban = async () => {
    if (!account.iban) return
    try {
      await navigator.clipboard.writeText(account.iban)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Kontokarte */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-[-5rem] w-48 h-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="bank" className="w-6 h-6" />
              <span className="font-semibold">Massawa Pay Konto</span>
            </div>
            <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
              {account.accountStatus === 'Opened' ? 'Aktiv' : account.accountStatus}
            </span>
          </div>

          <p className="text-blue-100 text-sm mt-8">Verfügbar</p>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight">
            {available ? formatMoney(parseFloat(available.value), available.currency) : '–'}
          </p>
          {account.balances && parseFloat(account.balances.pending.value) !== 0 && (
            <p className="text-blue-100 text-sm mt-1">
              Vorgemerkt: {formatMoney(parseFloat(account.balances.pending.value), account.balances.pending.currency)}
            </p>
          )}

          <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-wide">IBAN</p>
              <p className="font-mono text-base sm:text-lg break-all">
                {account.iban ? formatIban(account.iban) : 'Wird vergeben …'}
              </p>
              <p className="text-blue-100 text-xs mt-1">BIC {account.bic}</p>
            </div>
            {account.iban && (
              <button
                onClick={copyIban}
                className="bg-white text-blue-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 transition"
              >
                {copied ? 'Kopiert ✓' : 'IBAN kopieren'}
              </button>
            )}
          </div>
        </div>
      </div>

      <CardsSection cards={account.cards} holderName={account.holderName} onChange={onRefresh} />

      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-2xl p-4">
        Sandbox: Das ist ein echtes Konto bei unserem Bankpartner Swan, aber mit Testgeld. Überweisungen auf diese IBAN
        kannst du im Swan-Dashboard unter <em>Sandbox → Simulator</em> auslösen.
      </div>

      {/* Umsätze */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Umsätze</h2>
          <button onClick={onRefresh} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Icon name="refresh" className="w-4 h-4" /> Aktualisieren
          </button>
        </div>
        {account.transactions.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Noch keine Umsätze</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {account.transactions.map((t) => {
              const credit = t.side === 'Credit'
              const value = parseFloat(t.amount.value)
              return (
                <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${credit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      <Icon name={credit ? 'receive' : 'send'} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{t.counterparty || t.label}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {new Date(t.createdAt).toLocaleDateString('de-DE')} · {t.label}
                        {t.statusInfo.status !== 'Booked' && ` · ${t.statusInfo.status === 'Pending' ? 'vorgemerkt' : t.statusInfo.status}`}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold whitespace-nowrap ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                    {credit ? '+' : '−'}{formatMoney(value, t.amount.currency)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function OpenAccount({ data }: { data: BankData }) {
  const { options, prefill } = data
  const [form, setForm] = useState({
    employmentStatus: '',
    monthlyIncome: '',
    sourcesOfFunds: [] as string[],
    taxId: '',
    nationality: 'ETH',
    birthCity: '',
    birthCountry: 'ETH',
    residenceCountry: 'DEU',
    notUsPerson: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }))
  const toggleSource = (s: string) =>
    set('sourcesOfFunds', form.sourcesOfFunds.includes(s) ? form.sourcesOfFunds.filter((x) => x !== s) : [...form.sourcesOfFunds, s])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/swan/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Kontoeröffnung fehlgeschlagen')
        setSubmitting(false)
        return
      }
      // Weiter zum Swan-Login (Handynummer + Identitätsprüfung); danach kommt der Nutzer zurück nach /bank
      window.location.href = json.url
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
      setSubmitting(false)
    }
  }

  const select = 'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="relative">
          <Icon name="bank" className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-bold mt-4">Dein eigenes Konto mit IBAN</h1>
          <p className="text-blue-100 mt-2 max-w-lg">
            Eröffne in wenigen Minuten ein Konto bei unserem lizenzierten Bankpartner Swan – mit deutscher IBAN,
            SEPA-Überweisungen und deiner eigenen Massawa Mastercard.
          </p>
          <div className="flex flex-wrap gap-2 mt-5 text-sm">
            {['Deutsche IBAN', 'SEPA & Echtzeit', 'Massawa Mastercard'].map((f) => (
              <span key={f} className="bg-white/15 px-3 py-1 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <MassawaCard holderName={[prefill.firstName, prefill.lastName].filter(Boolean).join(' ') || null} />
        <p className="text-sm text-gray-500">Deine Massawa Card – virtuelle Mastercard, direkt nach der Kontoeröffnung</p>
      </div>

      {data.status === 'ONBOARDING' && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 text-sm">
          <Icon name="clock" className="w-5 h-5 shrink-0" />
          Du hast die Kontoeröffnung schon begonnen. Sende das Formular erneut, um beim Swan-Login weiterzumachen.
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900">Deine Angaben</h2>
          <p className="text-sm text-gray-500 mt-1">
            {prefill.firstName || prefill.lastName ? (
              <>
                {prefill.firstName} {prefill.lastName}
                {prefill.dateOfBirth && ` · geboren am ${new Date(prefill.dateOfBirth + 'T00:00:00').toLocaleDateString('de-DE')}`}
                {' '}– aus deiner Identitätsprüfung übernommen.
              </>
            ) : (
              'Name, Geburtsdatum und Adresse bestätigst du im nächsten Schritt direkt bei Swan.'
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Staatsangehörigkeit</span>
            <select className={select} value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
              {Object.entries(options.countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Wohnsitzland</span>
            <select className={select} value={form.residenceCountry} onChange={(e) => set('residenceCountry', e.target.value)}>
              {Object.entries(options.countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Geburtsort</span>
            <input className={select} value={form.birthCity} onChange={(e) => set('birthCity', e.target.value)} placeholder="z. B. Addis Abeba" required />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Geburtsland</span>
            <select className={select} value={form.birthCountry} onChange={(e) => set('birthCountry', e.target.value)}>
              {Object.entries(options.countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Berufsstatus</span>
            <select className={select} value={form.employmentStatus} onChange={(e) => set('employmentStatus', e.target.value)} required>
              <option value="">Bitte wählen</option>
              {Object.entries(options.employmentStatuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Monatliches Nettoeinkommen</span>
            <select className={select} value={form.monthlyIncome} onChange={(e) => set('monthlyIncome', e.target.value)} required>
              <option value="">Bitte wählen</option>
              {Object.entries(options.monthlyIncomes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-gray-700 mb-1">Steuer-Identifikationsnummer</span>
            <input
              className={select}
              value={form.taxId}
              onChange={(e) => set('taxId', e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11 Ziffern, steht z. B. auf deiner Lohnabrechnung"
              inputMode="numeric"
              required
            />
          </label>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Woher kommt das Geld auf dem Konto?</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(options.sourcesOfFunds).map(([k, v]) => {
              const active = form.sourcesOfFunds.includes(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleSource(k)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4"
            checked={form.notUsPerson}
            onChange={(e) => set('notUsPerson', e.target.checked)}
          />
          Ich bin nicht in den USA steuerpflichtig (keine US-Staatsbürgerschaft, keine Green Card, kein Wohnsitz in den USA).
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.notUsPerson || form.sourcesOfFunds.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {submitting ? 'Wird vorbereitet …' : 'Weiter zu Swan'}
        </button>
        <p className="text-xs text-gray-500 text-center">
          Im nächsten Schritt bestätigst du bei Swan deine Handynummer und Identität. Danach kommst du automatisch hierher zurück.
        </p>
      </form>
    </div>
  )
}

function CardsSection({ cards, holderName, onChange }: { cards: SwanCard[]; holderName: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const act = async (action: 'add' | 'view' | 'cancel', cardId?: string) => {
    if (action === 'cancel' && !confirm('Karte wirklich kündigen? Das kann nicht rückgängig gemacht werden.')) return
    setError('')
    setBusy(cardId ? `${action}-${cardId}` : action)
    try {
      const res = await fetch('/api/swan/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cardId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Aktion fehlgeschlagen')
        return
      }
      // Bestellen und Kartendaten anzeigen bestätigt der Nutzer auf der Swan-Seite (SCA)
      if (json.consentUrl) {
        window.location.href = json.consentUrl
        return
      }
      onChange()
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setBusy(null)
    }
  }

  const button = 'px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Massawa Card</h2>
        <span className="text-xs text-gray-500">Virtuelle Mastercard · Limit 1.000 € / Monat</span>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <MassawaCard holderName={holderName} dimmed className="sm:max-w-[260px]" />
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-gray-600 text-sm">
              Bezahle online, im Laden und mit Apple Pay oder Google Pay – direkt von deinem Massawa-Konto.
            </p>
            <button onClick={() => act('add')} disabled={busy !== null} className={`${button} bg-blue-600 text-white hover:bg-blue-700`}>
              {busy === 'add' ? 'Wird vorbereitet …' : 'Karte kostenlos bestellen'}
            </button>
          </div>
        </div>
      ) : (
        cards.map((card) => (
          <div key={card.id} className="flex flex-col sm:flex-row items-center gap-6">
            <MassawaCard
              holderName={holderName}
              maskedNumber={card.maskedNumber}
              expiryDate={card.expiryDate}
              label={card.type === 'Virtual' ? 'Virtual' : 'Debit'}
              dimmed={card.status !== 'Enabled'}
              className="sm:max-w-[300px]"
            />
            <div className="space-y-3 w-full sm:w-auto text-center sm:text-left">
              {card.status === 'Enabled' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                  <Icon name="check" className="w-3.5 h-3.5" /> Aktiv
                </span>
              )}
              {card.status === 'Processing' && (
                <span className="inline-flex text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">Wird ausgestellt …</span>
              )}
              {card.status === 'ConsentPending' && (
                <div className="space-y-2">
                  <span className="inline-flex text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full">Bestätigung ausstehend</span>
                  {card.consentUrl && (
                    <a href={card.consentUrl} className={`${button} block bg-blue-600 text-white hover:bg-blue-700 text-center`}>
                      Bei Swan bestätigen
                    </a>
                  )}
                </div>
              )}
              {card.status === 'Enabled' && (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button onClick={() => act('view', card.id)} disabled={busy !== null} className={`${button} bg-gray-900 text-white hover:bg-gray-800`}>
                    {busy === `view-${card.id}` ? '…' : 'Kartendaten anzeigen'}
                  </button>
                  <button onClick={() => act('cancel', card.id)} disabled={busy !== null} className={`${button} bg-white border border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600`}>
                    Kündigen
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
