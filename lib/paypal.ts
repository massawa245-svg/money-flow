// ⚠️ NUR PAYPAL-SANDBOX: Die Basis-URL ist fest auf die Sandbox gesetzt, damit kein echtes Geld fließt.
// Eine Live-Anbindung ist für Wallet-Aufladungen ohne eigene Lizenz / lizenzierten Partner nicht erlaubt.
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'

export function paypalConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`PayPal-Token fehlgeschlagen (${res.status})`)
  const data = await res.json()
  return data.access_token as string
}

async function paypalFetch(path: string, body: unknown) {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// Legt eine Bestellung an. custom_id = unsere User-ID, damit beim Capture geprüft werden kann,
// dass die Bestellung wirklich zu diesem Nutzer gehört.
export function createOrder(amount: number, userId: string) {
  return paypalFetch('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: 'EUR', value: amount.toFixed(2) },
        custom_id: userId,
        description: 'MoneyFlow Einzahlung (Sandbox)',
      },
    ],
  })
}

export function captureOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {})
}
