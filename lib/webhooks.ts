import { createHmac, randomBytes, randomUUID } from 'crypto'
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { prisma } from './prisma'

const TIMEOUT_MS = 10_000
const RETRY_DELAYS_MS = [0, 2_000, 8_000] // 3 Versuche direkt nach dem Event

export function generateWebhookSecret() {
  return 'whsec_' + randomBytes(24).toString('base64url')
}

// Stripe-ähnliche Signatur: Header "t=<unix>,v1=<hex>", HMAC-SHA256 über "<t>.<body>".
// Der Zeitstempel verhindert, dass abgefangene Events später erneut eingespielt werden.
export function signPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase()
    if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7))
    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||          // Link-local, u.a. Cloud-Metadaten
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // Carrier-grade NAT
    a >= 224                              // Multicast/reserviert
  )
}

// Schutz vor SSRF: nur https und keine Ziele im internen Netz
export async function validateWebhookUrl(value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || value.length > 2000) return 'Ungültige URL'
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Ungültige URL'
  }
  if (url.protocol !== 'https:') return 'Die URL muss mit https:// beginnen'
  if (url.username || url.password) return 'Zugangsdaten in der URL sind nicht erlaubt'

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return 'Interne Adressen sind nicht erlaubt'
  }
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
    if (addresses.some((a) => isPrivateAddress(a.address))) return 'Interne Adressen sind nicht erlaubt'
  } catch {
    return 'Adresse konnte nicht aufgelöst werden'
  }
  return null
}

async function attemptDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true }
  })
  if (!delivery) return false

  let responseStatus: number | null = null
  let lastError: string | null = null

  // Beim Zustellen erneut prüfen: DNS kann sich seit dem Anlegen geändert haben
  const urlError = await validateWebhookUrl(delivery.endpoint.url)
  if (urlError) {
    lastError = urlError
  } else {
    try {
      const res = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MoneyFlow-Webhooks/1.0',
          'X-Webhook-Id': delivery.eventId,
          'X-Webhook-Signature': signPayload(delivery.endpoint.secret, delivery.payload)
        },
        body: delivery.payload,
        redirect: 'manual', // Weiterleitungen nicht folgen (könnten ins interne Netz zeigen)
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      responseStatus = res.status
      if (res.status < 200 || res.status >= 300) lastError = `HTTP ${res.status}`
    } catch (error: any) {
      lastError = error?.name === 'TimeoutError' ? 'Zeitüberschreitung' : error?.message || 'Verbindungsfehler'
    }
  }

  const succeeded = lastError === null
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      attempts: { increment: 1 },
      status: succeeded ? 'SUCCEEDED' : 'FAILED',
      responseStatus,
      lastError: lastError?.slice(0, 500) ?? null,
      lastAttemptAt: new Date()
    }
  })
  return succeeded
}

// Stellt eine Zustellung mit bis zu 3 Versuchen zu. Nach dem Senden der API-Antwort per after() aufrufen.
export async function deliverWithRetries(deliveryId: string, { maxAttempts = RETRY_DELAYS_MS.length } = {}) {
  for (const delay of RETRY_DELAYS_MS.slice(0, maxAttempts)) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (await attemptDelivery(deliveryId)) return
  }
}

// Legt für jeden aktiven Endpoint des Händlers eine Zustellung an und liefert deren IDs
export async function createWebhookEvent(merchantId: string, type: string, data: object, onlyEndpointId?: string) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId, enabled: true, ...(onlyEndpointId ? { id: onlyEndpointId } : {}) }
  })
  if (endpoints.length === 0) return []

  const eventId = 'evt_' + randomUUID().replace(/-/g, '')
  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    type,
    created_at: new Date().toISOString(),
    livemode: false,
    data: { object: data }
  })

  const deliveries = await Promise.all(
    endpoints.map((endpoint) =>
      prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, eventId, eventType: type, payload } })
    )
  )
  return deliveries.map((d) => d.id)
}

// Event erzeugen und zustellen; Fehler werden nur geloggt, damit die Zahlung selbst nie daran scheitert
export async function dispatchWebhookEvent(merchantId: string, type: string, data: object) {
  try {
    const ids = await createWebhookEvent(merchantId, type, data)
    await Promise.all(ids.map((id) => deliverWithRetries(id)))
  } catch (error) {
    console.error(`❌ Webhook ${type} für Händler ${merchantId} fehlgeschlagen:`, error)
  }
}
