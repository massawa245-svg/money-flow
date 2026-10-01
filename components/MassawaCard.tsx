// Massawa Card – Mastercard-Design (Rotes Meer: Nachtblau → Petrol, goldene Akzente)
// Zeigt nur maskierte Daten; volle Kartennummer gibt es ausschließlich über die Swan-Seite (SCA).

type Props = {
  holderName?: string | null
  maskedNumber?: string | null
  expiryDate?: string | null
  label?: string
  dimmed?: boolean
  className?: string
}

function lastFour(masked?: string | null) {
  const digits = (masked ?? '').replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : '••••'
}

export function MassawaCard({ holderName, maskedNumber, expiryDate, label = 'Debit', dimmed, className = '' }: Props) {
  return (
    <div
      className={`relative w-full max-w-sm aspect-[1.586] rounded-2xl overflow-hidden text-white shadow-2xl select-none ${
        dimmed ? 'opacity-60 grayscale-[30%]' : ''
      } ${className}`}
      style={{ background: 'linear-gradient(135deg, #07152e 0%, #0b2a4a 45%, #0f5560 100%)' }}
    >
      {/* Wellen – das Rote Meer vor Massawa */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 252" preserveAspectRatio="none" aria-hidden>
        <path d="M0 170 C 80 140, 160 200, 240 165 S 360 130, 400 150 L400 252 L0 252 Z" fill="rgba(255,255,255,0.05)" />
        <path d="M0 200 C 90 175, 170 230, 260 200 S 370 170, 400 185 L400 252 L0 252 Z" fill="rgba(255,255,255,0.06)" />
        <path d="M0 150 C 70 125, 150 175, 230 145 S 350 115, 400 130" fill="none" stroke="rgba(212,175,55,0.35)" strokeWidth="1.2" />
        <circle cx="350" cy="40" r="90" fill="rgba(212,175,55,0.07)" />
      </svg>

      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <span className="block text-xl sm:text-2xl font-extrabold tracking-tight">Massawa</span>
            <span className="block text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-[#d4af37] mt-1">PAY</span>
          </div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/70">{label}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Chip */}
          <svg viewBox="0 0 48 36" className="w-10 sm:w-12" aria-hidden>
            <rect x="1" y="1" width="46" height="34" rx="6" fill="#d4af37" />
            <rect x="1" y="1" width="46" height="34" rx="6" fill="url(#chipShine)" />
            <path d="M16 1v34M32 1v34M1 12h15M32 12h15M1 24h15M32 24h15" stroke="#9c7a1e" strokeWidth="1.2" fill="none" />
            <defs>
              <linearGradient id="chipShine" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {/* Kontaktlos */}
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8.5 8.5a5 5 0 0 1 0 7" />
            <path d="M12 6a8.5 8.5 0 0 1 0 12" />
            <path d="M15.5 3.5a12 12 0 0 1 0 17" />
          </svg>
        </div>

        <p className="font-mono text-lg sm:text-xl tracking-[0.18em] drop-shadow">
          •••• •••• •••• {lastFour(maskedNumber)}
        </p>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-white/60">Karteninhaber</p>
            <p className="text-sm sm:text-base font-semibold uppercase truncate">{holderName || 'Dein Name'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-widest text-white/60">Gültig bis</p>
            <p className="text-sm sm:text-base font-semibold font-mono">{expiryDate || 'MM/JJ'}</p>
          </div>
          {/* Mastercard */}
          <svg viewBox="0 0 64 40" className="w-12 sm:w-14 shrink-0" aria-label="Mastercard">
            <circle cx="24" cy="20" r="16" fill="#EB001B" />
            <circle cx="40" cy="20" r="16" fill="#F79E1B" />
            <path d="M32 7.6a16 16 0 0 1 0 24.8a16 16 0 0 1 0-24.8z" fill="#FF5F00" />
          </svg>
        </div>
      </div>
    </div>
  )
}
