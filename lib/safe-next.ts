// Ziel nach dem Login ("?next=/pay/abc"). Nur relative Pfade der eigenen Seite
// erlauben, sonst ließe sich der Login als offene Weiterleitung missbrauchen.
export function safeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return value
}
