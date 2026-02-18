"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [iban, setIban] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    
    // Simuliere Auszahlung
    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6">
           Zurück zum Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2"> Geld abheben</h1>
          <p className="text-gray-600 mb-8">Auf dein externes Bankkonto auszahlen</p>

          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4"></div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Erfolgreich!</h2>
              <p className="text-gray-600">Die Auszahlung wird bearbeitet.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  required
                />
              </div>

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
                  min="10"
                  step="0.01"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Mindestbetrag: €10,00
                </p>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {processing ? "Wird bearbeitet..." : "Jetzt auszahlen"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Die Auszahlung erfolgt innerhalb von 1-2 Werktagen
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
