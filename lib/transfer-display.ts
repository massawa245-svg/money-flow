// Gemeinsame Anzeige-Logik für Transfers (Dashboard und Transaktionsliste).
// Ein-/Auszahlungen im Testmodus sind Transfers an sich selbst; der Status unterscheidet sie.

export interface TransferItem {
  id: string
  amount: number
  currency?: string
  status: string
  reference: string | null
  createdAt: string
  sender: { email: string; name?: string | null }
  recipient: { email: string; name?: string | null }
  exchange?: { toAmount: number; toCurrency: string; rate: number }
}

export type TransferKind = 'deposit' | 'withdrawal' | 'exchange' | 'sent' | 'received'

export function transferKind(t: TransferItem, myEmail: string | undefined): TransferKind {
  if (t.status === 'DEPOSIT') return 'deposit'
  if (t.status === 'WITHDRAWAL') return 'withdrawal'
  if (t.status === 'EXCHANGE') return 'exchange'
  return t.sender.email === myEmail ? 'sent' : 'received'
}

export function isOutgoing(kind: TransferKind) {
  return kind === 'sent' || kind === 'withdrawal'
}

export function transferTitle(t: TransferItem, kind: TransferKind) {
  switch (kind) {
    case 'deposit':
      return 'Einzahlung'
    case 'withdrawal':
      return 'Auszahlung'
    case 'exchange':
      return `Geldwechsel ${t.currency} → ${t.exchange?.toCurrency}`
    case 'sent':
      return 'An ' + (t.recipient.name || t.recipient.email.split('@')[0])
    case 'received':
      return 'Von ' + (t.sender.name || t.sender.email.split('@')[0])
  }
}

const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', ETB: 'Br' }

// Betrag mit Währungszeichen, z.B. "€ 12,50" / "Br 1.880,00"
export function formatMoney(amount: number, currency = 'EUR') {
  return `${SYMBOLS[currency] ?? currency} ${formatEuro(amount)}`
}

// Betrag für Listen: "− € 10,00", "+ $ 5,00" oder beim Wechsel "€ 100,00 → Br 18.629,31"
export function amountLabel(t: TransferItem, kind: TransferKind) {
  if (kind === 'exchange' && t.exchange) {
    return `${formatMoney(t.amount, t.currency)} → ${formatMoney(t.exchange.toAmount, t.exchange.toCurrency)}`
  }
  return `${isOutgoing(kind) ? '−' : '+'} ${formatMoney(t.amount, t.currency)}`
}

export function amountClass(kind: TransferKind) {
  return kind === 'exchange' ? 'text-gray-700' : isOutgoing(kind) ? 'text-red-600' : 'text-green-600'
}

export function formatEuro(amount: number) {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
