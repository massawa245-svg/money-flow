// Unterstützte Währungen mit Anzeige-Infos. Gleiche Liste wie lib/currencies.ts (Web/Server).
export const CURRENCIES = [
  { code: 'EUR', name: 'Euro', country: 'Europäische Union', flag: '🇪🇺' },
  { code: 'USD', name: 'US-Dollar', country: 'USA', flag: '🇺🇸' },
  { code: 'ETB', name: 'Äthiopischer Birr', country: 'Äthiopien', flag: '🇪🇹' },
  { code: 'ERN', name: 'Eritreischer Nakfa', country: 'Eritrea', flag: '🇪🇷' },
  { code: 'KES', name: 'Kenia-Schilling', country: 'Kenia', flag: '🇰🇪' },
  { code: 'UGX', name: 'Uganda-Schilling', country: 'Uganda', flag: '🇺🇬' },
  { code: 'SOS', name: 'Somalia-Schilling', country: 'Somalia', flag: '🇸🇴' },
  { code: 'SDG', name: 'Sudanesisches Pfund', country: 'Sudan', flag: '🇸🇩' },
  { code: 'SSP', name: 'Südsudanesisches Pfund', country: 'Südsudan', flag: '🇸🇸' },
  { code: 'EGP', name: 'Ägyptisches Pfund', country: 'Ägypten', flag: '🇪🇬' },
  { code: 'AED', name: 'VAE-Dirham', country: 'Vereinigte Arabische Emirate', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi-Riyal', country: 'Saudi-Arabien', flag: '🇸🇦' },
  { code: 'CAD', name: 'Kanadischer Dollar', country: 'Kanada', flag: '🇨🇦' },
  { code: 'NOK', name: 'Norwegische Krone', country: 'Norwegen', flag: '🇳🇴' },
  { code: 'SEK', name: 'Schwedische Krone', country: 'Schweden', flag: '🇸🇪' },
] as const

export type CurrencyInfo = (typeof CURRENCIES)[number]

export function currencyInfo(code: string) {
  return CURRENCIES.find((c) => c.code === code)
}
