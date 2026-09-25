export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'] as const;

export type KeypadKey = (typeof KEYS)[number];

// Betrag wird als Zeichenkette wie auf einem Taschenrechner getippt ("250,5")
export function applyKey(current: string, key: KeypadKey): string {
  if (key === 'del') return current.slice(0, -1);
  if (key === ',') return current.includes(',') ? current : (current || '0') + ',';
  const [, decimals] = current.split(',');
  if (decimals !== undefined && decimals.length >= 2) return current;
  if (current === '0') return key;
  if (current.replace(',', '').length >= 9) return current;
  return current + key;
}
