"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function TransferPage() {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)
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
    setUser(user)
    setChecking(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      console.log(" Sende Transfer mit Credentials...")
      
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', //  ABSOLUT NOTWENDIG!
        body: JSON.stringify({
          recipientEmail: recipient,
          amount: parseFloat(amount),
          reference
        })
      })

      const data = await response.json()
      console.log(" Response:", data)

      if (response.ok) {
        setStatus({
          type: 'success',
          message: data.message || ' Überweisung erfolgreich!'
        })
        setRecipient("")
        setAmount("")
        setReference("")
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Fehler bei der Überweisung'
        })
      }
    } catch (error) {
      console.error(" Fetch Error:", error)
      setStatus({
        type: 'error',
        message: 'Verbindungsfehler'
      })
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = [25, 50, 100, 250, 500]

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl"></span>
            </div>
          </div>
          <p className="mt-4 text-gray-600">Lade Transfer-Seite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header mit Navigation */}
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

        {/* Hauptkarte */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <span className="text-3xl"></span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Geld senden</h1>
                <p className="text-blue-100 text-sm mt-1">
                  Überweisung an Freunde & Familie
                </p>
              </div>
            </div>
          </div>

          {/* Formular */}
          <div className="p-8">
            {/* Status Message */}
            {status && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span className="text-2xl">{status.type === 'success' ? '' : ''}</span>
                <p>{status.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Empfänger Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Empfänger Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    
                  </span>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="freund@example.com"
                    required
                  />
                </div>
              </div>

              {/* Betrag */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Betrag ()
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="0,00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verwendungszweck (optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verwendungszweck <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    
                  </span>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="z.B. Geburtstagsgeschenk "
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-green-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                  </span>
                ) : (
                  " Geld senden"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
