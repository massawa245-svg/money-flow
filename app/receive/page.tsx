"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { QRCodeSVG } from "qrcode.react"
import Link from "next/link"

// Link/QR öffnet beim Absender die Senden-Seite mit Empfänger (und Betrag) vorausgefüllt
export default function ReceivePage() {
  const [amount, setAmount] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setOrigin(window.location.origin)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || "")
    })
  }, [router])

  const params = new URLSearchParams({ to: userEmail })
  if (amount && parseFloat(amount) > 0) params.set("amount", amount)
  const paymentLink = `${origin}/transfer?${params.toString()}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6">
          ← Zurück zum Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2">Geld empfangen</h1>
          <p className="text-gray-600 mb-8">Teile diesen Link oder QR-Code mit dem Absender</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Betrag (optional)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>

            {userEmail && origin && (
              <>
                <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={paymentLink} size={200} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zahlungslink
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentLink}
                      readOnly
                      className="flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                    <button
                      onClick={copyLink}
                      className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium whitespace-nowrap"
                    >
                      {copied ? "Kopiert ✓" : "Kopieren"}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-bold">Deine Empfänger-E-Mail:</span> {userEmail}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
