"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function ReceivePage() {
  const [amount, setAmount] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || "")
    })
  }, [router])

  const generateQR = () => {
    // Simuliere QR-Code
    setQrCode(`PAY:${userEmail}:${amount || '0'}`)
  }

  const paymentLink = `http://localhost:3000/pay?to=${encodeURIComponent(userEmail)}&amount=${amount}`

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6">
           Zurück zum Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2"> Geld empfangen</h1>
          <p className="text-gray-600 mb-8">Teile diesen Link oder QR-Code mit dem Absender</p>

          <div className="space-y-6">
            {/* Betrag eingeben */}
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

            {/* Zahlungslink */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zahlungslink
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(paymentLink)}
                  className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  
                </button>
              </div>
            </div>

            {/* QR-Code */}
            <div>
              <button
                onClick={generateQR}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                QR-Code generieren
              </button>
              
              {qrCode && (
                <div className="mt-6 p-6 bg-gray-50 rounded-lg text-center">
                  <div className="bg-white p-4 inline-block rounded-lg">
                    <p className="font-mono">{qrCode}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                     Scanne diesen Code mit der App
                  </p>
                </div>
              )}
            </div>

            {/* Deine Empfänger-Email */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-bold">Deine Empfänger-Email:</span> {userEmail}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
