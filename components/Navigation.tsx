"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Home */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl"></span>
              <span className="font-bold text-xl text-gray-900">MoneyFlow</span>
            </Link>
            
            {user && (
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                Dashboard
              </Link>
            )}
          </div>

          {/* User Bereich */}
          {user && (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <span className="text-lg"></span>
                <span className="text-sm font-medium">{user.email?.split('@')[0]}</span>
              </Link>
              
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
