"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/Icon"

type MerchantPayment = {
  id: string
  amount: number
  currency: string
  status: string
  reference: string | null
  expiresAt: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Wartet auf Scan",
  PROCESSING: "Wird bestätigt...",
  COMPLETED: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  EXPIRED: "Abgelaufen",
  CANCELLED: "Storniert",
}

const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"]

export default function MerchantPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isMerchant, setIsMerchant] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<MerchantPayment | null>(null)
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const res = await fetch('/api/merchant/payments', { credentials: 'include' })
    setIsMerchant(res.ok)
    setChecking(false)
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const res = await fetch('/api/merchant/enroll', { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setIsMerchant(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Aktivierung fehlgeschlagen')
      }
    } finally {
      setEnrolling(false)
    }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Bitte einen gültigen Betrag eingeben')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/merchant/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current
        },
        credentials: 'include',
        // Währung legt der Server fest (Kontowährung des Händlers)
        body: JSON.stringify({ amount: numAmount, reference: reference || '' })
      })

      const data = await res.json()

      if (res.ok) {
        setPayment(data.payment)
      } else {
        setError(data.error || 'Zahlungsanforderung fehlgeschlagen')
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
    } finally {
      setCreating(false)
    }
  }

  const handleNewPayment = () => {
    idempotencyKeyRef.current = crypto.randomUUID()
    setPayment(null)
    setAmount("")
    setReference("")
    setError(null)
  }

  const pollStatus = useCallback(async (id: string) => {
    const res = await fetch(`/api/merchant/payments/${id}`, { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setPayment(data.payment)
  }, [])

  useEffect(() => {
    if (!payment || TERMINAL_STATUSES.includes(payment.status)) return

    const interval = setInterval(() => pollStatus(payment.id), 2000)
    return () => clearInterval(interval)
  }, [payment, pollStatus])

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Kassen-Seite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
            <span>Zurück zum Dashboard</span>
          </Link>
          <div className="text-sm text-gray-500">
            Eingeloggt als: <span className="font-bold text-blue-600">{user?.email}</span>
          </div>
        </div>

        {isMerchant && (
          <Link
            href="/merchant/developers"
            className="mb-6 flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:border-blue-200 transition-colors"
          >
            <span>
              <span className="font-semibold">Online-Shop anbinden</span>
              <span className="block text-sm text-gray-500">API-Schlüssel und Checkout für deine Webseite</span>
            </span>
            <span className="text-blue-600">→</span>
          </Link>
        )}

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <Icon name="store" className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Kasse</h1>
                <p className="text-blue-100 text-sm mt-1">QR-Code für den Kunden erzeugen</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {!isMerchant && (
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Dieses Konto ist noch kein Händler-Konto.
                </p>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {enrolling ? 'Aktiviere...' : 'Als Händler aktivieren (Test)'}
                </button>
                <p className="text-xs text-gray-400">
                  Nur für MVP-Tests: kein echtes Onboarding, keine Prüfung.
                </p>
              </div>
            )}

            {isMerchant && error && (
              <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-800 border border-red-200">
                <Icon name="alert" className="w-6 h-6" />
                <p>{error}</p>
              </div>
            )}

            {isMerchant && !payment && (
              <form onSubmit={handleCreatePayment} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Betrag
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-2xl font-bold"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Referenz <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="z.B. Bestellung #123"
                    maxLength={100}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {creating ? 'Erzeuge QR-Code...' : 'QR-Code erzeugen'}
                </button>
              </form>
            )}

            {isMerchant && payment && (
              <div className="text-center space-y-6">
                <div>
                  <div className="text-4xl font-bold text-gray-900">
                    {payment.amount} {payment.currency}
                  </div>
                  {payment.reference && (
                    <div className="text-gray-500 mt-1">{payment.reference}</div>
                  )}
                </div>

                {payment.status === 'PENDING' && (
                  <div className="flex justify-center p-6 bg-gray-50 rounded-2xl">
                    {/* Voller Link: App-Scanner nimmt die ID am Ende, normale Handy-Kamera öffnet die Web-Bezahlseite */}
                    <QRCodeSVG value={`${window.location.origin}/pay/${payment.id}`} size={220} />
                  </div>
                )}

                <div className="text-xl font-semibold">
                  {STATUS_LABEL[payment.status] || payment.status}
                </div>

                {TERMINAL_STATUSES.includes(payment.status) ? (
                  <button
                    onClick={handleNewPayment}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                  >
                    Neue Zahlung
                  </button>
                ) : (
                  <button
                    onClick={handleNewPayment}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
