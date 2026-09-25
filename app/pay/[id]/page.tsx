"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface PaymentDetails {
  id: string
  amount: number
  currency: string
  status: string
  reference: string | null
  merchantName: string
  expiresAt: string
  successUrl: string | null
  cancelUrl: string | null
}

// Shop erfährt über ?checkout_id=, welche Zahlung zurückkommt (Status per API prüfen, nicht der URL vertrauen)
function withCheckoutId(url: string, id: string) {
  const target = new URL(url)
  target.searchParams.set("checkout_id", id)
  return target.toString()
}

const STATUS_TEXT: Record<string, string> = {
  COMPLETED: "Diese Zahlung wurde bereits bezahlt.",
  PROCESSING: "Diese Zahlung wird gerade bearbeitet.",
  EXPIRED: "Dieser QR-Code ist abgelaufen. Bitte an der Kasse einen neuen anfordern.",
  CANCELLED: "Diese Zahlung wurde vom Händler storniert.",
  FAILED: "Diese Zahlung ist fehlgeschlagen.",
}

// Web-Gegenstück zur Bezahlen-Ansicht der App: QR-Code an der Kasse → diese Seite
export default function PayPage() {
  const { id } = useParams<{ id: string }>()
  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    fetch(`/api/pay/${id}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Zahlung konnte nicht geladen werden")
        setPayment(data.payment)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleConfirm = async () => {
    setError("")
    setConfirming(true)
    try {
      const res = await fetch(`/api/pay/${id}/confirm`, { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.payment?.failureReason || "Zahlung fehlgeschlagen")
      }
      setPaid(true)
      if (payment?.successUrl) {
        const target = withCheckoutId(payment.successUrl, payment.id)
        setTimeout(() => window.location.assign(target), 2000)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setConfirming(false)
    }
  }

  const formatted = payment
    ? payment.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : ""

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 inline-block mb-6">
          ← Zurück zum Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {!payment ? (
            <>
              <h1 className="text-2xl font-bold mb-2">Zahlung nicht verfügbar</h1>
              <p className="text-red-600">{error}</p>
            </>
          ) : paid ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">✓</div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Bezahlt</h1>
              <p className="text-3xl font-bold mb-1">{formatted} {payment.currency}</p>
              <p className="text-gray-600 mb-6">an {payment.merchantName}</p>
              {payment.successUrl ? (
                <a href={withCheckoutId(payment.successUrl, payment.id)} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                  Zurück zu {payment.merchantName}
                </a>
              ) : (
                <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                  Fertig
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-1">Zahlung an</p>
              <h1 className="text-xl font-semibold mb-6">{payment.merchantName}</h1>
              <p className="text-5xl font-bold tracking-tight mb-1">{formatted}</p>
              <p className="text-gray-500 mb-4">{payment.currency}</p>
              {payment.reference && <p className="text-gray-600 mb-6">{payment.reference}</p>}

              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-6">
                Testmodus: Es wird kein echtes Geld bewegt.
              </div>

              {payment.status === "PENDING" ? (
                <>
                  {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {confirming ? "Wird bezahlt..." : `${formatted} ${payment.currency} bezahlen`}
                  </button>
                  {payment.cancelUrl && (
                    <a href={withCheckoutId(payment.cancelUrl, payment.id)} className="block mt-4 text-gray-500 hover:text-gray-700 text-sm">
                      Abbrechen und zurück zum Shop
                    </a>
                  )}
                </>
              ) : (
                <p className="text-gray-700 font-medium">{STATUS_TEXT[payment.status] || `Status: ${payment.status}`}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
