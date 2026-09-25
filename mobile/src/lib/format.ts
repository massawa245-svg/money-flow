// Beträge im deutschen Format: 12.450,00
export function formatAmount(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', ETB: 'Br' };

// "12,50 €" / "1.880,00 Br"
export function formatMoney(value: number, currency: string): string {
  return `${formatAmount(value)} ${SYMBOLS[currency] ?? currency}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) return `Heute, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Gestern';

  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}
