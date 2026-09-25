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
}

export type TransferKind = 'deposit' | 'withdrawal' | 'sent' | 'received'

export function transferKind(t: TransferItem, myEmail: string | undefined): TransferKind {
  if (t.status === 'DEPOSIT') return 'deposit'
  if (t.status === 'WITHDRAWAL') return 'withdrawal'
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
    case 'sent':
      return 'An ' + (t.recipient.name || t.recipient.email.split('@')[0])
    case 'received':
      return 'Von ' + (t.sender.name || t.sender.email.split('@')[0])
  }
}

export function formatEuro(amount: number) {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
