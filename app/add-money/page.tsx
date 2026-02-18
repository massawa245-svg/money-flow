"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import StripePayment from '@/components/StripePayment'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function AddMoneyPage() {
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<'amount' | 'payment'>('amount')
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const [clientSecret, setClientSecret] = useState("")
  const [paymentIntentId, setPaymentIntentId] = useState("")
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

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const response = await fetch('/api/stripe/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: parseFloat(amount),
        userId: user.id,
        email: user.email
      })
    })
    
    const data = await response.json()
    
    if (data.clientSecret) {
      setClientSecret(data.clientSecret)
      setPaymentIntentId(data.paymentIntentId)
      setStep('payment')
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
          <p className="text-gray-600 mb-8">Lade dein Konto sicher und schnell auf</p>

          {step === 'amount' ? (
            <form onSubmit={handleAmountSubmit} className="space-y-6">
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

              <button
                type="submit"
                disabled={!amount}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                Weiter zur Zahlung
              </button>
            </form>
          ) : (
            clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePayment 
                  amount={parseFloat(amount)} 
                  userId={user.id} 
                  email={user.email}
                />
              </Elements>
            )
          )}
        </div>
      </div>
    </div>
  )
}