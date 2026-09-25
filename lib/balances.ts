import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

type Tx = Prisma.TransactionClient
type Owner = { id: string; currency: string }

// Alle Guthaben eines Nutzers; die Hauptwährung liegt in User.balance, weitere in CurrencyBalance
export async function getBalances(user: Owner & { balance: number }) {
  const others = await prisma.currencyBalance.findMany({
    where: { userId: user.id, currency: { not: user.currency } },
    orderBy: { currency: 'asc' }
  })
  return [
    { currency: user.currency, amount: user.balance },
    ...others.map((b) => ({ currency: b.currency, amount: b.amount }))
  ]
}

// Abbuchen nur, wenn das Guthaben im selben Moment reicht (bedingtes Update statt Lesen-dann-Schreiben)
export async function debit(tx: Tx, user: Owner, currency: string, amount: number) {
  const result =
    currency === user.currency
      ? await tx.user.updateMany({
          where: { id: user.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } }
        })
      : await tx.currencyBalance.updateMany({
          where: { userId: user.id, currency, amount: { gte: amount } },
          data: { amount: { decrement: amount } }
        })
  return result.count === 1
}

export async function credit(tx: Tx, user: Owner, currency: string, amount: number) {
  if (currency === user.currency) {
    await tx.user.update({ where: { id: user.id }, data: { balance: { increment: amount } } })
  } else {
    await tx.currencyBalance.upsert({
      where: { userId_currency: { userId: user.id, currency } },
      update: { amount: { increment: amount } },
      create: { userId: user.id, currency, amount }
    })
  }
}
