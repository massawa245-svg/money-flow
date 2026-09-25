"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  formatEuro,
  isOutgoing,
  transferKind,
  transferTitle,
  type TransferItem,
  type TransferKind,
} from "@/lib/transfer-display"

const FILTERS: { key: "all" | TransferKind; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "sent", label: "Gesendet" },
  { key: "received", label: "Empfangen" },
  { key: "deposit", label: "Einzahlungen" },
  { key: "withdrawal", label: "Auszahlungen" },
]

const KIND_STYLE: Record<TransferKind, string> = {
  sent: "text-orange-600",
  withdrawal: "text-orange-600",
  received: "text-green-600",
  deposit: "text-green-600",
}

export default function TransactionsPage() {
  const [filter, setFilter] = useState<"all" | TransferKind>("all")
  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [email, setEmail] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setEmail(user.email)

      try {
        const res = await fetch("/api/transfer", { credentials: "include" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Fehler beim Laden")
        setTransfers(data.transfers || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const rows = transfers.map((t) => ({ t, kind: transferKind(t, email) }))
  const filtered = filter === "all" ? rows : rows.filter((r) => r.kind === filter)
  const sum = (kind: TransferKind) => rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.t.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Transaktionen</h1>
        <Link href="/transfer" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center">
          Neue Überweisung
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gesendet", value: sum("sent") },
          { label: "Empfangen", value: sum("received") },
          { label: "Eingezahlt", value: sum("deposit") },
          { label: "Ausgezahlt", value: sum("withdrawal") },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-gray-500 text-sm mb-1">{card.label}</p>
            <p className="text-xl font-bold text-gray-900">€ {formatEuro(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm ${filter === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Keine Transaktionen gefunden.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(({ t, kind }) => (
              <div key={t.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className={`font-medium ${KIND_STYLE[kind]}`}>{transferTitle(t, kind)}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {new Date(t.createdAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                    {t.reference ? ` · ${t.reference}` : ""}
                  </p>
                </div>
                <p className={`font-bold whitespace-nowrap ${isOutgoing(kind) ? "text-red-600" : "text-green-600"}`}>
                  {isOutgoing(kind) ? "−" : "+"} € {formatEuro(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
