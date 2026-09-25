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

type WebhookEndpoint = { id: string; url: string; enabled: boolean; createdAt: string }

type WebhookDelivery = {
  id: string
  eventId: string
  eventType: string
  payload: string
  status: string
  attempts: number
  responseStatus: number | null
  lastError: string | null
  lastAttemptAt: string | null
  createdAt: string
  endpoint: { url: string }
}

const DELIVERY_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  PENDING: "bg-gray-100 text-gray-700",
}

const VERIFY_SNIPPET = `const crypto = require("crypto")

// rawBody = unveränderter Request-Body als String
function verifyWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")))
  const expected = crypto
    .createHmac("sha256", secret)
    .update(parts.t + "." + rawBody)
    .digest("hex")
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300 // max. 5 Minuten alt
  const given = Buffer.from(parts.v1 || "")
  return fresh && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), given)
}

// Header: X-Webhook-Signature`

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

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [webhookUrl, setWebhookUrl] = useState("")
  const [addingWebhook, setAddingWebhook] = useState(false)
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null)
  const [webhookError, setWebhookError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openDeliveryId, setOpenDeliveryId] = useState<string | null>(null)

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

  const loadWebhooks = useCallback(async () => {
    const [endpointsRes, deliveriesRes] = await Promise.all([
      fetch("/api/merchant/webhooks", { credentials: "include" }),
      fetch("/api/merchant/webhooks/deliveries", { credentials: "include" }),
    ])
    if (endpointsRes.ok) setEndpoints((await endpointsRes.json()).endpoints)
    if (deliveriesRes.ok) setDeliveries((await deliveriesRes.json()).deliveries)
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    loadKeys()
    loadWebhooks()
  }, [loadKeys, loadWebhooks])

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    setWebhookError("")
    setAddingWebhook(true)
    try {
      const res = await fetch("/api/merchant/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: webhookUrl.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Webhook konnte nicht angelegt werden")
      setNewWebhookSecret(data.endpoint.secret)
      setWebhookUrl("")
      await loadWebhooks()
    } catch (e: any) {
      setWebhookError(e.message)
    } finally {
      setAddingWebhook(false)
    }
  }

  const handleDeleteWebhook = async (endpoint: WebhookEndpoint) => {
    if (!confirm(`Webhook ${endpoint.url} löschen?`)) return
    await fetch(`/api/merchant/webhooks/${endpoint.id}`, { method: "DELETE", credentials: "include" })
    await loadWebhooks()
  }

  // Test-Event oder erneutes Senden: Ergebnis steht danach im Protokoll
  const runWebhookAction = async (id: string, path: string) => {
    setWebhookError("")
    setBusyId(id)
    try {
      const res = await fetch(path, { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok) setWebhookError(data.error || "Aktion fehlgeschlagen")
    } finally {
      setBusyId(null)
      await loadWebhooks()
    }
  }

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

        {/* Webhooks */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-1">Webhooks</h2>
          <p className="text-sm text-gray-600 mb-4">
            Wir senden ein <code>payment.completed</code>-Event an deine URL, sobald eine Zahlung abgeschlossen ist (Checkout und QR-Kasse).
          </p>

          {newWebhookSecret && (
            <div className="mb-6 p-4 rounded-lg border border-green-200 bg-green-50">
              <p className="font-semibold text-green-800 mb-2">Signatur-Geheimnis – jetzt kopieren!</p>
              <p className="text-sm text-green-800 mb-3">
                Damit prüft dein Server, dass ein Event wirklich von uns kommt. Es wird nur dieses eine Mal angezeigt.
              </p>
              <input readOnly value={newWebhookSecret} className="w-full px-3 py-2 font-mono text-sm bg-white border border-green-200 rounded-lg" />
              <button onClick={() => setNewWebhookSecret(null)} className="mt-3 text-sm text-green-800 underline">
                Ich habe es gespeichert
              </button>
            </div>
          )}

          <form onSubmit={handleAddWebhook} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://dein-shop.de/webhooks/zahlung"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={addingWebhook}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {addingWebhook ? "Wird geprüft..." : "Webhook hinzufügen"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mb-4">
            Noch kein eigener Server?{" "}
            <button
              type="button"
              onClick={() => setWebhookUrl(`${origin}/api/webhook-test-receiver`)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Eingebauten Test-Empfänger verwenden
            </button>
            {" "}– er nimmt jedes Event an, den Inhalt siehst du unten im Protokoll.
          </p>

          {webhookError && <p className="text-red-600 text-sm mb-4">{webhookError}</p>}

          {endpoints.length > 0 && (
            <div className="divide-y divide-gray-100 mb-6">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="font-mono text-sm break-all">{endpoint.url}</p>
                  <div className="flex gap-4 text-sm shrink-0">
                    <button
                      onClick={() => runWebhookAction(endpoint.id, `/api/merchant/webhooks/${endpoint.id}/test`)}
                      disabled={busyId === endpoint.id}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {busyId === endpoint.id ? "Sende..." : "Test-Event senden"}
                    </button>
                    <button onClick={() => handleDeleteWebhook(endpoint)} className="text-red-600 hover:text-red-800">
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-semibold mb-2">Letzte Zustellungen</h3>
          {deliveries.length === 0 ? (
            <p className="text-gray-500 text-sm">Noch keine Events gesendet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {deliveries.map((d) => (
                <div key={d.id} className="py-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${DELIVERY_STYLE[d.status] || ""}`}>
                        {d.status === "SUCCEEDED" ? "Zugestellt" : d.status === "FAILED" ? "Fehlgeschlagen" : "Ausstehend"}
                      </span>
                      <code>{d.eventType}</code>
                      {d.responseStatus ? <span className="text-gray-500"> · HTTP {d.responseStatus}</span> : null}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(d.lastAttemptAt || d.createdAt)} · {d.attempts} Versuch(e) · {d.endpoint.url}
                      {d.lastError ? ` · ${d.lastError}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-4 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setOpenDeliveryId(openDeliveryId === d.id ? null : d.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {openDeliveryId === d.id ? "Inhalt ausblenden" : "Inhalt anzeigen"}
                    </button>
                    {d.status !== "SUCCEEDED" && (
                      <button
                        onClick={() => runWebhookAction(d.id, `/api/merchant/webhooks/deliveries/${d.id}/retry`)}
                        disabled={busyId === d.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {busyId === d.id ? "Sende..." : "Erneut senden"}
                      </button>
                    )}
                  </div>
                </div>
                {openDeliveryId === d.id && (
                  <pre className="mt-2 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">
                    {JSON.stringify(JSON.parse(d.payload), null, 2)}
                  </pre>
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
          <div>
            <p className="font-medium mb-2">3. Webhook-Signatur prüfen (Node.js)</p>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">{VERIFY_SNIPPET}</pre>
            <p className="text-sm text-gray-600 mt-2">
              Antworte mit HTTP 2xx, sonst versuchen wir es bis zu 3-mal. Dasselbe Event kann mehrfach ankommen – erkenne Duplikate an der <code>id</code>.
            </p>
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
