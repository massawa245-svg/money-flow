"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // Profil-Daten
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [birthday, setBirthday] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("/default-avatar.png")
  
  const router = useRouter()

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setFullName(user.user_metadata?.full_name || "")
    setPhone(user.user_metadata?.phone || "")
    setAddress(user.user_metadata?.address || "")
    setBirthday(user.user_metadata?.birthday || "")
    setAvatarUrl(user.user_metadata?.avatar_url || "/default-avatar.png")
    setLoading(false)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone,
          address,
          birthday,
        }
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: '✅ Profil erfolgreich aktualisiert!'
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Fehler beim Speichern'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simuliere Avatar-Upload
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarUrl(e.target?.result as string)
      setMessage({
        type: 'success',
        text: ' Avatar aktualisiert (Demo)'
      })
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
          <p className="mt-4 text-gray-600">Lade Profil...</p>
        </div>
      </div>
    )
  }

  const provider = user?.app_metadata?.provider || 'email'
  const createdAt = new Date(user?.created_at || Date.now()).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header mit Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform"></span>
            <span>Zurück zum Dashboard</span>
          </Link>
        </div>

        {/* Hauptkarte */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <span className="text-3xl"></span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mein Profil</h1>
                <p className="text-blue-100 text-sm mt-1">
                  Verwalte deine persönlichen Daten
                </p>
              </div>
            </div>
          </div>

          {/* Profil-Inhalt */}
          <div className="p-8">
            {/* Erfolgs-/Fehlermeldung */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span className="text-2xl">{message.type === 'success' ? '✅' : '❌'}</span>
                <p>{message.text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Linke Spalte - Avatar & Status */}
              <div className="space-y-6">
                {/* Avatar */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border-2 border-blue-100 text-center">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-4xl text-white mx-auto border-4 border-white shadow-xl">
                      {avatarUrl === "/default-avatar.png" ? (
                        <span>👤</span>
                      ) : (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      )}
                    </div>
                    <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg">
                      <span className="text-sm">📷</span>
                      <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <h2 className="text-xl font-bold mt-4">{fullName || user?.email?.split('@')[0]}</h2>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                </div>

                {/* Konto-Info */}
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="text-blue-600"></span>
                    Konto-Informationen
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mitglied seit:</span>
                      <span className="font-medium">{createdAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Login-Methode:</span>
                      <span className="font-medium flex items-center gap-1">
                        {provider === 'google' ? ' Google' : ' Email'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Konto-Status:</span>
                      <span className="text-green-600 font-medium"> Aktiv</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rechte Spalte - Formular */}
              <div className="md:col-span-2 space-y-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-6">
                  {/* Vollständiger Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vollständiger Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                        
                      </span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="Max Mustermann"
                      />
                    </div>
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Telefonnummer
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                        
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>

                  {/* Adresse */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresse
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-400 text-xl">
                        
                      </span>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="Straße, Hausnummer, PLZ, Ort"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Geburtstag */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Geburtstag
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                        
                      </span>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Wird gespeichert...
                        </span>
                      ) : (
                        " Änderungen speichern"
                      )}
                    </button>
                    
                    <Link
                      href="/dashboard"
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all text-center"
                    >
                      Abbrechen
                    </Link>
                  </div>
                </form>

                {/* Sicherheitsbereich */}
                <div className="mt-8 pt-6 border-t-2 border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="text-red-500"></span>
                    Sicherheitseinstellungen
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                      href="/change-password"
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        
                      </div>
                      <div>
                        <p className="font-semibold">Passwort ändern</p>
                        <p className="text-xs text-gray-500">Regelmäßig aktualisieren</p>
                      </div>
                    </Link>

                    <Link
                      href="/two-factor"
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        
                      </div>
                      <div>
                        <p className="font-semibold">2FA aktivieren</p>
                        <p className="text-xs text-gray-500">Zwei-Faktor-Authentifizierung</p>
                      </div>
                    </Link>

                    <Link
                      href="/sessions"
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        
                      </div>
                      <div>
                        <p className="font-semibold">Aktive Sitzungen</p>
                        <p className="text-xs text-gray-500">Geräte verwalten</p>
                      </div>
                    </Link>

                    <Link
                      href="/delete-account"
                      className="p-4 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        
                      </div>
                      <div>
                        <p className="font-semibold text-red-600">Konto löschen</p>
                        <p className="text-xs text-red-500">Diese Aktion ist endgültig</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
