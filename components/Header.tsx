"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

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
            <span className="text-2xl">💰</span>
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
                className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                🏠 Home
              </Link>
              {user ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    📊 Dashboard
                  </Link>
                  <Link 
                    href="/transfer" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    💸 Send Money
                  </Link>
                  <Link 
                    href="/receive" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    📥 Receive
                  </Link>
                  <Link 
                    href="/withdraw" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    🏧 Withdraw
                  </Link>
                  <Link 
                    href="/add-money" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    💰 Add Money
                  </Link>
                  <Link 
                    href="/profile" 
                    className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    👤 Profile
                  </Link>
                  <div className="pt-2 mt-2 border-t border-blue-500">
                    <p className="text-sm text-blue-200 mb-2 px-3">
                      👋 {user.email}
                    </p>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="block py-2 text-white hover:bg-blue-600 px-3 rounded-lg transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  🔐 Login
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