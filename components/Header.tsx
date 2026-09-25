"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Icon } from "@/components/Icon"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Blauer Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white fixed top-0 w-full z-50 shadow-lg">
        <div className="px-4 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Icon name="wallet" className="w-5 h-5" />
            </span>
            <span className="font-bold text-xl">MoneyFlow</span>
          </Link>

          {/* Hamburger Icon (drei Striche) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Hamburger Menü (Dropdown) */}
        {isMenuOpen && (
          <div className="bg-blue-700 border-t border-blue-500">
            <div className="px-4 py-3 space-y-2">
              <Link 
                href="/" 
                className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon name="home" className="w-5 h-5 opacity-80" />
                Startseite
              </Link>
              {user ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="chart" className="w-5 h-5 opacity-80" />
                    Übersicht
                  </Link>
                  <Link 
                    href="/transfer" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="send" className="w-5 h-5 opacity-80" />
                    Geld senden
                  </Link>
                  <Link 
                    href="/receive" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="receive" className="w-5 h-5 opacity-80" />
                    Geld empfangen
                  </Link>
                  <Link 
                    href="/withdraw" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="withdraw" className="w-5 h-5 opacity-80" />
                    Auszahlen
                  </Link>
                  <Link 
                    href="/add-money" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="plus" className="w-5 h-5 opacity-80" />
                    Einzahlen
                  </Link>
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon name="user" className="w-5 h-5 opacity-80" />
                    Profil
                  </Link>
                  <div className="pt-2 mt-2 border-t border-blue-500">
                    <p className="text-sm text-blue-200 mb-2 px-3">
                      Angemeldet als {user.email}
                    </p>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-3 text-left py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    >
                      <Icon name="logout" className="w-5 h-5 opacity-80" />
                    Abmelden
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="flex items-center gap-3 py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon name="login" className="w-5 h-5 opacity-80" />
                  Anmelden
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      {/* Platzhalter für festen Header */}
      <div className="h-14"></div>
    </>
  )
}