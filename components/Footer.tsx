import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-600 to-blue-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Hauptfooter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div>
            <h3 className="font-bold mb-3">Über uns</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li><Link href="/about" className="hover:text-white">Über MoneyFlow</Link></li>
              <li><Link href="/careers" className="hover:text-white">Karriere</Link></li>
              <li><Link href="/press" className="hover:text-white">Presse</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">Hilfe</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white">Kontakt</Link></li>
              <li><Link href="/support" className="hover:text-white">Support</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li><Link href="/impressum" className="hover:text-white">Impressum</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Datenschutz</Link></li>
              <li><Link href="/agb" className="hover:text-white">AGB</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">Folge uns</h3>
            <div className="flex space-x-4 text-2xl">
              <a href="#" className="hover:text-white">📱</a>
              <a href="#" className="hover:text-white">💬</a>
              <a href="#" className="hover:text-white">📘</a>
              <a href="#" className="hover:text-white">🐦</a>
            </div>
          </div>
        </div>

        {/* Trennlinie */}
        <div className="border-t border-blue-500 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-blue-100">
            <p>© 2026 MoneyFlow. Alle Rechte vorbehalten.</p>
            <div className="flex gap-4 mt-2 md:mt-0">
              <span>🇩🇪 Deutschland</span>
              <span>💳 Sicher bezahlen</span>
              <span>🔒 SSL verschlüsselt</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}