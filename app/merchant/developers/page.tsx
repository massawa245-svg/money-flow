"use client"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type ApiKey = {
  id: string
  name: string | null
  prefix: string
  mode: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "–"
}

export default function DevelopersPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [origin, setOrigin] = useState("")

  const loadKeys = useCallback(async () => {
    const res = await fetch("/api/merchant/api-keys", { credentials: "include" })
    if (res.status === 403) {
      router.push("/merchant")
      return
    }
    const data = await res.json()
    if (res.ok) setKeys(data.keys)
    else setError(data.error || "Schlüssel konnten nicht geladen werden")
    setLoading(false)
  }, [router])

  useEffect(() => {
    setOrigin(window.location.origin)
    loadKeys()
  }, [loadKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCreating(true)
    try {
      const res = await fetch("/api/merchant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Schlüssel konnte nicht erstellt werden")
      setNewSecret(data.key.secret)
      setCopied(false)
      setName("")
      await loadKeys()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (key: ApiKey) => {
    if (!confirm(`Schlüssel ${key.prefix}… widerrufen? Shops, die ihn nutzen, können dann keine Zahlungen mehr erstellen.`)) return
    const res = await fetch(`/api/merchant/api-keys/${key.id}`, { method: "DELETE", credentials: "include" })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Widerrufen fehlgeschlagen")
    }
    await loadKeys()
  }

  const copySecret = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
  }

  const curlCreate = `curl -X POST ${origin}/api/v1/checkout \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: bestellung-1001" \\
  -d '{
    "amount": 25.50,
    "reference": "Bestellung #1001",
    "success_url": "https://dein-shop.de/danke",
    "cancel_url": "https://dein-shop.de/warenkorb"
  }'`

  const curlGet = `curl ${origin}/api/v1/checkout/CHECKOUT_ID \\
  -H "Authorization: Bearer sk_test_..."`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div>
          <Link href="/merchant" className="text-blue-600 hover:text-blue-800">
            ← Zurück zur Kasse
          </Link>
          <h1 className="text-3xl font-bold mt-4">Entwickler</h1>
          <p className="text-gray-600 mt-1">Zahlungen aus deinem Online-Shop über die API annehmen</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3">
          Testmodus: Alle Schlüssel sind Test-Schlüssel (<code>sk_test_…</code>). Es wird kein echtes Geld bewegt.
        </div>

        {/* API-Schlüssel */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">API-Schlüssel</h2>

          {newSecret && (
            <div className="mb-6 p-4 rounded-lg border border-green-200 bg-green-50">
              <p className="font-semibold text-green-800 mb-2">Neuer Schlüssel – jetzt kopieren!</p>
              <p className="text-sm text-green-800 mb-3">
                Er wird nur dieses eine Mal angezeigt. Bewahre ihn geheim auf, nur auf deinem Server, nie in einer App oder Webseite.
              </p>
              <div className="flex gap-2">
                <input readOnly value={newSecret} className="flex-1 min-w-0 px-3 py-2 font-mono text-sm bg-white border border-green-200 rounded-lg" />
                <button onClick={copySecret} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                  {copied ? "Kopiert ✓" : "Kopieren"}
                </button>
              </div>
              <button onClick={() => setNewSecret(null)} className="mt-3 text-sm text-green-800 underline">
                Ich habe ihn gespeichert
              </button>
            </div>
          )}

          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-6">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name, z.B. „Mein Shop“ (optional)"
              maxLength={50}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Wird erstellt..." : "Neuen Schlüssel erstellen"}
            </button>
          </form>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {keys.length === 0 ? (
            <p className="text-gray-500 text-sm">Noch keine Schlüssel.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {keys.map((key) => (
                <div key={key.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {key.name || "Ohne Namen"}{" "}
                      <span className="font-mono text-sm text-gray-500">{key.prefix}…</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Erstellt {formatDate(key.createdAt)} · Zuletzt benutzt {formatDate(key.lastUsedAt)}
                    </p>
                  </div>
                  {key.revokedAt ? (
                    <span className="text-sm text-gray-400">Widerrufen</span>
                  ) : (
                    <button onClick={() => handleRevoke(key)} className="text-sm text-red-600 hover:text-red-800 self-start sm:self-auto">
                      Widerrufen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Kurzanleitung */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xl font-semibold">So funktioniert der Checkout</h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Dein Server erstellt eine Checkout-Sitzung mit Betrag und Rücksprung-Adressen.</li>
            <li>Du leitest den Kunden auf die zurückgegebene <code>url</code> weiter.</li>
            <li>Der Kunde meldet sich an und bezahlt mit seinem Wallet-Guthaben.</li>
            <li>Er landet auf deiner <code>success_url</code> mit <code>?checkout_id=…</code>.</li>
            <li>Dein Server prüft per API, ob der Status <code>completed</code> ist, und liefert erst dann aus.</li>
          </ol>

          <div>
            <p className="font-medium mb-2">1. Checkout erstellen</p>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">{curlCreate}</pre>
          </div>
          <div>
            <p className="font-medium mb-2">2. Status prüfen</p>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">{curlGet}</pre>
          </div>
          <p className="text-sm text-gray-600">
            Mögliche Status: <code>pending</code>, <code>processing</code>, <code>completed</code>, <code>failed</code>, <code>expired</code>.
            Ein Checkout-Link ist 30 Minuten gültig. Bezahlt wird in der Kontowährung deines Händlerkontos.
          </p>
        </section>
      </div>
    </div>
  )
}
