"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Transfer {
  id: string
  amount: number
  reference: string | null
  createdAt: string
  sender: { email: string }
  recipient: { email: string }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [transfers, setTransfers] = useState<Transfer[]>([])
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
      {/* Header mit Balance */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">Willkommen zurück</p>
              <h1 className="text-xl sm:text-2xl font-semibold mt-1">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-blue-100 text-sm">Verfügbares Guthaben</p>
              <p className="text-2xl sm:text-4xl font-bold tracking-tight">
                € {balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Farbig & Größer für Desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
            {[
              { href: "/transfer", icon: "💸", label: "Senden", color: "from-blue-500 to-blue-600" },
              { href: "/receive", icon: "📥", label: "Empfangen", color: "from-green-500 to-green-600" },
              { href: "/withdraw", icon: "🏧", label: "Abheben", color: "from-orange-500 to-orange-600" },
              { href: "/add-money", icon: "💰", label: "Aufladen", color: "from-purple-500 to-purple-600" },
              { href: "/profile", icon: "👤", label: "Profil", color: "from-gray-500 to-gray-600" }
            ].map((item, idx) => (
              <Link key={idx} href={item.href} className="flex-1 min-w-[70px] sm:min-w-[100px] max-w-[100px] sm:max-w-[120px]">
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-2xl sm:text-3xl shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200`}>
                    {item.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 mt-2 text-center">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <p className="text-gray-500 text-xs sm:text-sm mb-1">Gesendet</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">€ {stats.sent.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-2">+12% diesen Monat</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <p className="text-gray-500 text-xs sm:text-sm mb-1">Empfangen</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">€ {stats.received.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-2">+8% diesen Monat</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <p className="text-gray-500 text-xs sm:text-sm mb-1">Transaktionen</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.count}</p>
            <p className="text-xs text-gray-500 mt-2">+{stats.count} insgesamt</p>
          </div>
        </div>
      </div>

      {/* Letzte Transaktionen */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Letzte Transaktionen</h2>
            <Link href="/transactions" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium">
              Alle anzeigen →
            </Link>
          </div>
          
          {transfers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-gray-500 text-sm sm:text-base">Noch keine Transaktionen</p>
              <Link href="/transfer" className="text-blue-600 text-xs sm:text-sm mt-2 inline-block">
                Jetzt erste Überweisung →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transfers.slice(0, 5).map((t) => {
                const isSent = t.sender.email === user?.email
                const date = new Date(t.createdAt)
                return (
                  <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <span className="text-sm sm:text-base">{isSent ? '⬆' : '⬇'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                          {isSent ? 'An ' + t.recipient.email.split('@')[0] : 'Von ' + t.sender.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {date.toLocaleDateString('de-DE')} {t.reference && `· ${t.reference}`}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm sm:text-base ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                      {isSent ? '-' : '+'} € {t.amount.toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}