"use client"
import Link from "next/link"
import { Icon } from "@/components/Icon"

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-600 to-blue-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
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
          
        </div>

        {/* Trennlinie */}
        <div className="border-t border-blue-500 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-blue-100">
            <p>© 2026 MoneyFlow. Alle Rechte vorbehalten.</p>
            <div className="flex gap-4 mt-2 md:mt-0">
              <span className="flex items-center gap-1.5"><Icon name="shield" className="w-4 h-4" /> Sicher bezahlen</span>
              <span className="flex items-center gap-1.5"><Icon name="lock" className="w-4 h-4" /> SSL verschlüsselt</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}