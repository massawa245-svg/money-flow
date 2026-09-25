import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma'

// Solange es keinen echten Zahlungspartner gibt, werden nur Test-Schlüssel ausgegeben
const KEY_PREFIX = 'sk_test_'
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function randomBase62(length: number) {
  // 256 ist durch 62 nicht teilbar → Werte oberhalb von 247 verwerfen, damit alle Zeichen gleich wahrscheinlich sind
  let out = ''
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248 && out.length < length) out += BASE62[byte % 62]
    }
  }
  return out
}

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey() {
  const key = KEY_PREFIX + randomBase62(32)
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 4), hashedKey: hashApiKey(key) }
}

// Prüft "Authorization: Bearer sk_test_..." und liefert den zugehörigen Händler
export async function authenticateApiKey(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer sk_')) return null

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey: hashApiKey(header.slice('Bearer '.length).trim()) },
    include: { merchant: true }
  })
  if (!apiKey || apiKey.revokedAt || apiKey.merchant.role !== 'MERCHANT') return null

  // Nicht auf das Update warten, damit API-Aufrufe schnell bleiben
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((e) => console.error('lastUsedAt-Update fehlgeschlagen:', e))

  return { apiKey, merchant: apiKey.merchant }
}
