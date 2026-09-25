import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Eingeloggter Händler aus der Web-Session (Cookie), oder null
export async function getSessionMerchant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const merchant = await prisma.user.findUnique({ where: { email: user.email! } })
  if (!merchant || merchant.role !== 'MERCHANT') return null
  return merchant
}

// Eingeloggter Admin (darf Ausweise prüfen), oder null
export async function getSessionAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = await prisma.user.findUnique({ where: { email: user.email! } })
  if (!admin?.isAdmin) return null
  return { admin, supabase }
}
