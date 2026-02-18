import { prisma } from '@/lib/prisma'

export class TransferService {
  
  // Transfer zwischen zwei Usern
  static async createTransfer(
    senderEmail: string,
    recipientEmail: string,
    amount: number,
    reference?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Sender finden
      const sender = await tx.user.findUnique({
        where: { email: senderEmail },
        select: { balance: true, id: true, email: true }
      })
      
      if (!sender) throw new Error('Sender nicht gefunden')
      if (sender.balance < amount) throw new Error('Nicht genügend Guthaben')
      
      // 2. Recipient finden
      const recipient = await tx.user.findUnique({
        where: { email: recipientEmail }
      })
      
      if (!recipient) throw new Error('Empfänger nicht gefunden')
      
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
      const transfer = await tx.transfer.create({
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
      
      return transfer
    })
  }

  // User Balance abrufen
  static async getUserBalance(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { balance: true, currency: true }
    })
    return user
  }

  // Transfer History eines Users
  static async getUserTransfers(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) return []

    return await prisma.transfer.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { recipientId: user.id }
        ]
      },
      include: {
        sender: { select: { email: true, name: true } },
        recipient: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // User erstellen (nach Registrierung)
  static async createUser(email: string, name: string) {
    return await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: name || email.split('@')[0],
        balance: 1000.00,
        currency: 'EUR'
      }
    })
  }
}
