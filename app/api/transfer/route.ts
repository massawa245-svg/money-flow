import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Transfers und Balance abrufen (für Dashboard)
export async function GET() {
  console.log(" GET /api/transfer aufgerufen")
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error(' Kein User in Session gefunden')
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    console.log(" User gefunden:", user.email)

    // User in Prisma finden oder erstellen
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    })

    if (!dbUser) {
      console.log(" User existiert nicht in Prisma, lege an...")
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!.split('@')[0],
          balance: 1000.00,
          currency: 'EUR'
        }
      })
      console.log(" User angelegt mit ID:", dbUser.id)
    }

    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          { senderId: dbUser.id },
          { recipientId: dbUser.id }
        ]
      },
      include: {
        sender: { select: { email: true, name: true } },
        recipient: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      transfers,
      balance: dbUser.balance
    })

  } catch (error: any) {
    console.error(' Fehler in GET:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - Neuen Transfer erstellen
export async function POST(request: Request) {
  console.log(" POST /api/transfer aufgerufen")
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error(' Kein User in Session gefunden')
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    const { recipientEmail, amount, reference } = await request.json()

    // Transfer mit Prisma durchführen
    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Sender finden oder erstellen
      let sender = await tx.user.findUnique({
        where: { email: user.email! }
      })
      
      if (!sender) {
        console.log(" Sender existiert nicht, lege an...")
        sender = await tx.user.create({
          data: {
            email: user.email!,
            name: user.user_metadata?.full_name || user.email!.split('@')[0],
            balance: 1000.00
          }
        })
      }
      
      if (sender.balance < amount) throw new Error('Nicht genügend Guthaben')
      
      // 2. Recipient finden ODER ERSTELLEN! 
      let recipient = await tx.user.findUnique({
        where: { email: recipientEmail }
      })
      
      if (!recipient) {
        console.log(" Empfänger existiert nicht, lege an...")
        recipient = await tx.user.create({
          data: {
            email: recipientEmail,
            name: recipientEmail.split('@')[0],
            balance: 1000.00 // Startguthaben für neuen User
          }
        })
        console.log(" Empfänger angelegt mit ID:", recipient.id)
      }
      
      // 3. Balances aktualisieren
      await tx.user.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } }
      })
      
      await tx.user.update({
        where: { id: recipient.id },
        data: { balance: { increment: amount } }
      })
      
      // 4. Transfer speichern
      return await tx.transfer.create({
        data: {
          amount,
          senderId: sender.id,
          recipientId: recipient.id,
          reference: reference || '',
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          sender: { select: { email: true, name: true } },
          recipient: { select: { email: true, name: true } }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: '✅ Überweisung erfolgreich!',
      transfer
    })

  } catch (error: any) {
    console.error('❌ Fehler in POST:', error)
    return NextResponse.json(
      { error: error.message || 'Überweisung fehlgeschlagen' },
      { status: 400 }
    )
  }
}
