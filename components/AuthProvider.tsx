"use client"
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  fingerprintEnabled: boolean
  enableFingerprint: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false)

  useEffect(() => {
    // Prüfe ob User eingeloggt ist
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Prüfe Fingerprint Support
    if (window.PublicKeyCredential) {
      setFingerprintEnabled(true)
    }

    // Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = (email: string, password: string) => {
    return supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const signInWithGoogle = () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const signOut = () => {
    return supabase.auth.signOut()
  }

  const enableFingerprint = async () => {
    try {
      // WebAuthn / Fingerprint
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "Money Transfer App" },
          user: {
            id: new Uint8Array(16),
            name: user?.email || "",
            displayName: user?.email || ""
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }]
        }
      })
      console.log("Fingerprint enabled:", credential)
      return { success: true }
    } catch (error) {
      console.error("Fingerprint error:", error)
      return { success: false, error }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      fingerprintEnabled,
      enableFingerprint
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
