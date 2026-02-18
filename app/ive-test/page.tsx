"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function WiseLiveTestPage() {
  const [amount, setAmount] = useState("5")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLiveTransfer = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/wise/test-live-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(amount),
          recipientAccount: {} // Hier später echte Bankdaten
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">💰 Wise Live Test mit echtem Geld</h1>
        <p className="text-sm text-orange-600 mb-4">
          ⚠️ Das ist ECHTES Geld! Nur kleine Beträge testen (z.B. 5€).
        </p>
        
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Betrag in EUR"
          className="w-full px-4 py-3 border rounded-lg mb-4"
        />

        <button
          onClick={testLiveTransfer}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
        >
          {loading ? 'Wird getestet...' : '💰 Live Transfer testen'}
        </button>

        {result && (
          <pre className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}