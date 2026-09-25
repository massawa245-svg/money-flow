import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// POST - Konto als Händler aktivieren.
// ⚠️ Nur für MVP/Testing: Self-Service ohne Prüfung. Für den echten Rollout
// braucht es einen richtigen Merchant-Onboarding-/KYC-Prozess.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const merchant = await prisma.user.upsert({
      where: { email: user.email! },
      update: { role: 'MERCHANT' },
      create: {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        role: 'MERCHANT'
      }
    })

    return NextResponse.json({ success: true, merchant: { id: merchant.id, role: merchant.role } })
  } catch (error: any) {
    console.error('❌ Fehler in POST /api/merchant/enroll:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
