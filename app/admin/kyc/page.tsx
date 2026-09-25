"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Icon } from "@/components/Icon"

type Submission = {
  id: string
  email: string
  kycStatus: string
  firstName: string | null
  lastName: string | null
  dateOfBirth: string | null
  street: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  kycSubmittedAt: string | null
  kycReviewedAt: string | null
  kycRejectReason: string | null
  documents: { idFront: string | null; idBack: string | null; selfie: string | null }
}

const TABS = [
  { key: "PENDING", label: "Offen" },
  { key: "APPROVED", label: "Freigeschaltet" },
  { key: "REJECTED", label: "Abgelehnt" },
] as const

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "–"
}

export default function AdminKycPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/kyc?status=${tab}`, { credentials: "include" })
    if (res.status === 403) {
      setForbidden(true)
    } else {
      const data = await res.json()
      if (res.ok) setSubmissions(data.submissions)
      else setError(data.error || "Laden fehlgeschlagen")
    }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (s: Submission, action: "approve" | "reject") => {
    let reason = ""
    if (action === "reject") {
      reason = prompt(`Grund der Ablehnung für ${s.firstName} ${s.lastName} (sieht der Kunde):`, "Ausweis nicht lesbar – bitte neu fotografieren") || ""
      if (!reason.trim()) return
    } else if (!confirm(`${s.firstName} ${s.lastName} (${s.email}) freischalten?`)) {
      return
    }

    setError("")
    setBusyId(s.id)
    try {
      const res = await fetch(`/api/admin/kyc/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Entscheidung fehlgeschlagen")
    } finally {
      setBusyId(null)
      await load()
    }
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-600">Kein Zugriff. Diese Seite ist nur für das Prüfteam.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">← Zurück</Link>
        <h1 className="text-3xl font-bold mt-4 mb-6">Identitätsprüfung</h1>

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm ${tab === t.key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-gray-500">Keine Einträge.</p>
        ) : (
          <div className="space-y-6">
            {submissions.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xl font-semibold">{s.firstName} {s.lastName}</p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                  </div>
                  <div className="text-sm text-gray-500 md:text-right">
                    <p>Eingereicht: {formatDate(s.kycSubmittedAt)}</p>
                    {s.kycReviewedAt && <p>Entschieden: {formatDate(s.kycReviewedAt)}</p>}
                  </div>
                </div>

                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                  <div><dt className="text-gray-500 inline">Geburtsdatum: </dt><dd className="inline font-medium">{s.dateOfBirth}</dd></div>
                  <div><dt className="text-gray-500 inline">Land: </dt><dd className="inline font-medium">{s.country}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-gray-500 inline">Adresse: </dt><dd className="inline font-medium">{s.street}, {s.postalCode} {s.city}</dd></div>
                  {s.kycRejectReason && (
                    <div className="sm:col-span-2 text-red-700"><dt className="inline">Ablehnungsgrund: </dt><dd className="inline">{s.kycRejectReason}</dd></div>
                  )}
                </dl>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {([
                    ["idFront", "Ausweis vorne"],
                    ["idBack", "Ausweis hinten"],
                    ["selfie", "Selfie"],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      {s.documents[key] ? (
                        <a href={s.documents[key]!} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.documents[key]!} alt={label} className="w-full h-48 object-contain bg-gray-100 rounded-lg border border-gray-200" />
                        </a>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">Nicht verfügbar</div>
                      )}
                    </div>
                  ))}
                </div>

                {s.kycStatus === "PENDING" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => decide(s, "approve")}
                      disabled={busyId === s.id}
                      className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <Icon name="check" className="w-4 h-4" /> Freischalten
                    </button>
                    <button
                      onClick={() => decide(s, "reject")}
                      disabled={busyId === s.id}
                      className="flex items-center gap-2 px-5 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      <Icon name="close" className="w-4 h-4" /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
