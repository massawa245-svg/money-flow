"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // ⚠️ TESTMODUS: Auszahlung ändert nur den Kontostand in der Datenbank, kein echtes Geld
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setProcessing(true)

    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'WITHDRAWAL', amount: parseFloat(amount) })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Auszahlung fehlgeschlagen')
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6">
           Zurück zum Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2"> Geld abheben</h1>
          <p className="text-gray-600 mb-4">Guthaben von deinem Konto abbuchen</p>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-8">
            Testmodus: Es wird nur der Kontostand geändert, kein echtes Geld bewegt.
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4"></div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Erfolgreich!</h2>
              <p className="text-gray-600">€{parseFloat(amount).toFixed(2)} wurden von deinem Konto abgebucht.</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={!amount || processing}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {processing ? "Wird bearbeitet..." : "Jetzt auszahlen"}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
