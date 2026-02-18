import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const body = await request.json()
  
  // Webhook von Wise verarbeiten
  if (body.event === 'transfers#state-change' && body.data.status === 'outgoing_payment_sent') {
    // Transfer abgeschlossen → Guthaben erhöhen
    const transferId = body.data.resource.id
    const amount = body.data.resource.sourceAmount
    
    // Hier musst du den User finden (über deine Datenbank)
    // und sein Guthaben erhöhen
  }

  return NextResponse.json({ received: true })
}