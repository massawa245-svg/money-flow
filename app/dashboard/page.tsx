"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const response = await fetch('/api/transfer', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      
      if (data.success) {
        setTransfers(data.transfers || [])
        setBalance(data.balance || 0)
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    sent: transfers.filter(t => t.sender.email === user?.email).reduce((sum, t) => sum + t.amount, 0),
    received: transfers.filter(t => t.recipient.email === user?.email).reduce((sum, t) => sum + t.amount, 0),
    count: transfers.length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100">Willkommen zurück,</p>
              <h1 className="text-3xl font-bold">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h1>
            </div>
            <div className="text-right">
              <p className="text-blue-100">Aktuelles Guthaben</p>
              <p className="text-4xl font-bold">{balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-5 gap-3 bg-white rounded-xl shadow-lg p-4">
          {[
            { href: "/transfer", icon: "", label: "Senden", desc: "An Freunde" },
            { href: "/receive", icon: "", label: "Empfangen", desc: "QR-Code" },
            { href: "/withdraw", icon: "", label: "Abheben", desc: "Auf Konto" },
            { href: "/add-money", icon: "", label: "Aufladen", desc: "Geld einzahlen" },
            { href: "/profile", icon: "", label: "Profil", desc: "Einstellungen" }
          ].map((item) => (
            <Link key={item.href} href={item.href} className="text-center hover:bg-gray-50 p-3 rounded-lg transition">
              <div className="text-3xl mb-1">{item.icon}</div>
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-600 text-sm">Gesendet</p>
            <p className="text-2xl font-bold mt-2">€{stats.sent.toFixed(2)}</p>
            <p className="text-green-600 text-sm mt-2">+12% diesen Monat</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-600 text-sm">Empfangen</p>
            <p className="text-2xl font-bold mt-2">€{stats.received.toFixed(2)}</p>
            <p className="text-green-600 text-sm mt-2">+8% diesen Monat</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-600 text-sm">Transaktionen</p>
            <p className="text-2xl font-bold mt-2">{stats.count}</p>
            <p className="text-gray-600 text-sm mt-2">+{stats.count} insgesamt</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Letzte Transaktionen</h2>
            <Link href="/transactions" className="text-blue-600 text-sm hover:underline">Alle anzeigen →</Link>
          </div>
          
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Noch keine Transaktionen</p>
              <Link href="/transfer" className="text-blue-600 text-sm mt-2 inline-block">Jetzt erste Überweisung </Link>
            </div>
          ) : (
            <div className="divide-y">
              {transfers.slice(0, 5).map((t) => {
                const isSent = t.sender.email === user?.email
                return (
                  <div key={t.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSent ? 'bg-orange-100' : 'bg-green-100'}`}>
                        <span>{isSent ? '' : ''}</span>
                      </div>
                      <div>
                        <p className="font-medium">{isSent ? 'An ' + t.recipient.email.split('@')[0] : 'Von ' + t.sender.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString('de-DE')}</p>
                      </div>
                    </div>
                    <p className={`font-bold ${isSent ? 'text-orange-600' : 'text-green-600'}`}>
                      {isSent ? '-' : '+'}{t.amount.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <Link href="/transfer">
          <button className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl hover:bg-blue-700 transition flex items-center justify-center text-2xl">
            
          </button>
        </Link>
      </div>
    </div>
  )
}
