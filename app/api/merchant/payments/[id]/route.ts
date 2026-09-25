import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Status einer einzelnen Zahlungsanforderung abfragen (Kasse pollt/lauscht darauf)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const merchant = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!merchant) {
      return NextResponse.json({ error: 'Kein Händler-Konto' }, { status: 403 })
    }

    const payment = await prisma.merchantPayment.findUnique({ where: { id } })

    if (!payment || payment.merchantId !== merchant.id) {
      return NextResponse.json({ error: 'Zahlung nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ success: true, payment })
  } catch (error: any) {
    console.error('❌ Fehler in GET /api/merchant/payments/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
