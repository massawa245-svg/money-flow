"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { amountClass, amountLabel, formatEuro, formatMoney, isOutgoing, transferKind, transferTitle, type TransferItem } from "@/lib/transfer-display"
import { Icon, type IconName } from "@/components/Icon"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [loading, setLoading] = useState(true)
  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [otherBalances, setOtherBalances] = useState<{ currency: string; amount: number }[]>([])
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
        setKycStatus(data.kycStatus ?? null)
        setOtherBalances((data.balances || []).slice(1))
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const kinds = transfers.map(t => ({ t, kind: transferKind(t, user?.email) }))
  const stats = {
    sent: kinds.filter(k => k.kind === 'sent').reduce((sum, k) => sum + k.t.amount, 0),
    received: kinds.filter(k => k.kind === 'received').reduce((sum, k) => sum + k.t.amount, 0),
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
              {otherBalances.length > 0 && (
                <p className="text-blue-100 text-sm mt-1">
                  {otherBalances.map((b) => formatMoney(b.amount, b.currency)).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hinweis: Konto noch nicht freigeschaltet */}
      {kycStatus && kycStatus !== 'APPROVED' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Link
            href="/verify"
            className={`flex items-center gap-3 rounded-2xl border p-4 ${
              kycStatus === 'PENDING' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <Icon name={kycStatus === 'PENDING' ? 'clock' : 'shield'} className="w-6 h-6 shrink-0" />
            <span className="flex-1">
              <span className="font-semibold block">
                {kycStatus === 'PENDING' ? 'Dein Ausweis wird geprüft' : kycStatus === 'REJECTED' ? 'Prüfung abgelehnt – bitte erneut einreichen' : 'Konto noch nicht freigeschaltet'}
              </span>
              <span className="text-sm opacity-80">
                {kycStatus === 'PENDING' ? 'Danach kannst du Geld senden, bezahlen, ein- und auszahlen.' : 'Bestätige deine Identität, um Geld zu senden und zu bezahlen.'}
              </span>
            </span>
            {kycStatus !== 'PENDING' && <span className="font-semibold whitespace-nowrap">Jetzt bestätigen →</span>}
          </Link>
        </div>
      )}

      {/* Schnellaktionen */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
            {([
              { href: "/transfer", icon: "send", label: "Senden" },
              { href: "/receive", icon: "receive", label: "Empfangen" },
              { href: "/add-money", icon: "plus", label: "Einzahlen" },
              { href: "/withdraw", icon: "withdraw", label: "Auszahlen" },
              { href: "/exchange", icon: "exchange", label: "Wechseln" },
              { href: "/merchant", icon: "store", label: "Kasse" },
              { href: "/profile", icon: "user", label: "Profil" }
            ] satisfies { href: string; icon: IconName; label: string }[]).map((item, idx) => (
              <Link key={idx} href={item.href} className="flex-1 min-w-[70px] sm:min-w-[100px] max-w-[100px] sm:max-w-[120px]">
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors duration-200">
                    <Icon name={item.icon} className="w-6 h-6 sm:w-7 sm:h-7" />
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
            <p className="text-xl sm:text-2xl font-bold text-gray-900">€ {formatEuro(stats.sent)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <p className="text-gray-500 text-xs sm:text-sm mb-1">Empfangen</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">€ {formatEuro(stats.received)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <p className="text-gray-500 text-xs sm:text-sm mb-1">Transaktionen</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.count}</p>
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
              {kinds.slice(0, 5).map(({ t, kind }) => {
                const isSent = isOutgoing(kind)
                const date = new Date(t.createdAt)
                return (
                  <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                        kind === 'exchange' ? 'bg-gray-100 text-gray-700' : isSent ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <Icon name={kind === 'exchange' ? 'exchange' : isSent ? 'send' : 'receive'} className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                          {transferTitle(t, kind)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {date.toLocaleDateString('de-DE')} {t.reference && `· ${t.reference}`}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm sm:text-base text-right ${amountClass(kind)}`}>
                      {amountLabel(t, kind)}
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