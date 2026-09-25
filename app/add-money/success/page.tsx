"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Automatische Weiterleitung nach 3 Sekunden
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
          
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Zahlung erfolgreich!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Dein Guthaben wird in Kürze aktualisiert.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Zum Dashboard
          </Link>
          
          <p className="text-sm text-gray-500">
            Du wirst automatisch weitergeleitet...
          </p>
        </div>
      </div>
    </div>
  )
}
