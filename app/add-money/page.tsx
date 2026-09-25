"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ⚠️ TESTMODUS: Einzahlung ändert nur den Kontostand in der Datenbank, kein echtes Geld
export default function AddMoneyPage() {
  const [amount, setAmount] = useState("")
  const [checking, setChecking] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setChecking(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setProcessing(true)

    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEPOSIT', amount: parseFloat(amount) })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Einzahlung fehlgeschlagen')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setProcessing(false)
    }
  }

  const quickAmounts = [20, 50, 100, 250, 500]

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Zurück zum Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">💰 Geld einzahlen</h1>
          <p className="text-gray-600 mb-4">Lade dein Konto auf</p>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-8">
            Testmodus: Es wird nur der Kontostand geändert, kein echtes Geld bewegt. Maximal 1.000 € pro Einzahlung.
          </div>

          {success ? (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-green-600 mb-2">Eingezahlt!</h2>
              <p className="text-gray-600">€{parseFloat(amount).toFixed(2)} wurden deinem Konto gutgeschrieben.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Betrag (€)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="1"
                  max="1000"
                  step="0.01"
                  required
                />
              </div>

              <div className="flex gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm font-medium"
                  >
                    €{amt}
                  </button>
                ))}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={!amount || processing}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {processing ? "Wird eingezahlt..." : "Jetzt einzahlen"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
