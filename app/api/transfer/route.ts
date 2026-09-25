import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ratelimit } from '@/lib/rate-limit'
import { validateTransfer } from '@/lib/validator'
import { requireVerified } from '@/lib/kyc'
import { getBalances } from '@/lib/balances'

// GET - Transfers und Balance abrufen (für Dashboard)
export async function GET(request: Request) {
  console.log("📡 GET /api/transfer aufgerufen")
  
  try {
    // Web (Cookie) und Mobile-App (Bearer-Token)
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      console.error('❌ Kein User in Session gefunden')
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    console.log("✅ User gefunden:", user.email)

    // 🔒 RATE LIMITING für GET
    const { success } = await ratelimit.limit(`get-${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
        { status: 429 }
      )
    }

    // User in Prisma finden oder erstellen
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    })

    if (!dbUser) {
      console.log("📝 User existiert nicht in Prisma, lege an...")
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!.split('@')[0],
          balance: 1000.00,
          currency: 'EUR'
        }
      })
      console.log("✅ User angelegt mit ID:", dbUser.id)
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

    // Abgeschlossene QR-/Checkout-Zahlungen liegen in einer eigenen Tabelle. Sie werden im
    // Transfer-Format angehängt (Kunde = sender, Händler = recipient), damit App und Web sie
    // ohne Änderung als "Gesendet"/"Erhalten" anzeigen.
    const merchantPayments = await prisma.merchantPayment.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ payerId: dbUser.id }, { merchantId: dbUser.id }]
      },
      include: {
        payer: { select: { email: true, name: true } },
        merchant: { select: { email: true, name: true } }
      },
      orderBy: { completedAt: 'desc' },
      take: 100
    })

    const paymentsAsTransfers = merchantPayments
      .filter((p) => p.payer)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: 'COMPLETED',
        reference: p.reference || (p.source === 'CHECKOUT' ? 'Online-Zahlung' : 'QR-Zahlung'),
        createdAt: p.completedAt ?? p.createdAt,
        sender: p.payer!,
        recipient: p.merchant
      }))

    // Geldwechsel ebenfalls im Transfer-Format (an sich selbst, Status EXCHANGE)
    const exchanges = await prisma.currencyExchange.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    const me = { email: dbUser.email, name: dbUser.name }
    const exchangesAsTransfers = exchanges.map((x) => ({
      id: x.id,
      amount: x.fromAmount,
      currency: x.fromCurrency,
      status: 'EXCHANGE',
      reference: `${x.fromCurrency} → ${x.toCurrency}`,
      createdAt: x.createdAt,
      sender: me,
      recipient: me,
      exchange: { toAmount: x.toAmount, toCurrency: x.toCurrency, rate: x.rate }
    }))

    const activity = [...transfers, ...paymentsAsTransfers, ...exchangesAsTransfers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({
      success: true,
      transfers: activity,
      balance: dbUser.balance,
      currency: dbUser.currency,
      balances: await getBalances(dbUser),
      kycStatus: dbUser.kycStatus
    })

  } catch (error: any) {
    console.error('❌ Fehler in GET:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - Neuen Transfer erstellen
export async function POST(request: Request) {
  console.log("📡 POST /api/transfer aufgerufen")
  
  try {
    // Web (Cookie) und Mobile-App (Bearer-Token)
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      console.error('❌ Kein User in Session gefunden')
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    // 🔒 1. RATE LIMITING
    const { success } = await ratelimit.limit(`transfer-${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
        { status: 429 }
      )
    }

    // 📦 2. Daten aus Request holen
    const { recipientEmail, amount, reference } = await request.json()

    // 🔒 3. INPUT VALIDIERUNG
    const validationErrors = validateTransfer({ recipientEmail, amount, reference })
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      )
    }

    // 🔒 4. Selbst-Transfer blockieren
    if (recipientEmail === user.email) {
      return NextResponse.json(
        { error: 'Du kannst dir nicht selbst Geld senden' },
        { status: 400 }
      )
    }

    // 🔒 5. Nur verifizierte Konten dürfen Geld senden
    const blocked = requireVerified(await prisma.user.findUnique({ where: { email: user.email! } }))
    if (blocked) return blocked

    // Transfer mit Prisma durchführen
    const transfer = await prisma.$transaction(async (tx) => {
      // 5. Sender finden oder erstellen
      let sender = await tx.user.findUnique({
        where: { email: user.email! }
      })
      
      if (!sender) {
        console.log("📝 Sender existiert nicht, lege an...")
        sender = await tx.user.create({
          data: {
            email: user.email!,
            name: user.user_metadata?.full_name || user.email!.split('@')[0],
            balance: 1000.00
          }
        })
      }
      
      if (sender.balance < amount) throw new Error('Nicht genügend Guthaben')
      
      // 6. Recipient finden ODER ERSTELLEN
      let recipient = await tx.user.findUnique({
        where: { email: recipientEmail }
      })
      
      if (!recipient) {
        console.log("📝 Empfänger existiert nicht, lege an...")
        recipient = await tx.user.create({
          data: {
            email: recipientEmail,
            name: recipientEmail.split('@')[0],
            balance: 1000.00
          }
        })
        console.log("✅ Empfänger angelegt mit ID:", recipient.id)
      }
      
      // 7. Balances aktualisieren
      await tx.user.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } }
      })
      
      await tx.user.update({
        where: { id: recipient.id },
        data: { balance: { increment: amount } }
      })
      
      // 8. Transfer speichern
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