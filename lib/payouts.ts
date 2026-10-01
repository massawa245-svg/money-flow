import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { createChapaTransfer, getChapaBanks } from '@/lib/chapa'
import { getMarketRate, isCurrency, markupPercent, round2 } from '@/lib/fx'

// ⚠️ TESTMODUS: Guthaben wird nur in der Datenbank abgebucht, Chapa simuliert die Auszahlung.
export const MIN_PAYOUT = 1
export const MAX_PAYOUT = 1000

export type PayoutDestination = { bankCode: number; accountNumber: string; accountName: string }

// Prüft das Ziel gegen die Chapa-Bankliste; liefert das Ziel mit Banknamen oder eine Fehlermeldung
export async function validateDestination(input: any): Promise<{ destination: PayoutDestination & { bankName: string } } | { error: string }> {
  const bankCode = Number(input?.bankCode)
  const accountNumber = typeof input?.accountNumber === 'string' ? input.accountNumber.replace(/\s/g, '') : ''
  const accountName = typeof input?.accountName === 'string' ? input.accountName.trim() : ''

  const bank = (await getChapaBanks()).find((b) => b.code === bankCode)
  if (!bank) return { error: 'Bitte Bank oder Wallet wählen' }
  if (!/^\d+$/.test(accountNumber)) return { error: 'Die Kontonummer darf nur Ziffern enthalten' }
  if (bank.accountLength && accountNumber.length !== bank.accountLength) {
    return { error: `${bank.name}: Die Nummer muss ${bank.accountLength} Ziffern haben` }
  }
  if (accountName.length < 2 || accountName.length > 100) return { error: 'Bitte den Namen des Empfängers angeben' }

  return { destination: { bankCode, accountNumber, accountName, bankName: bank.name } }
}

// Betrag in Kontowährung → ETB. Aufschlag wie beim Geldwechsel; ETB→ETB ohne Gebühr.
export async function quotePayout(currency: string, amount: number) {
  if (!isCurrency(currency)) throw new Error(`Auszahlung aus ${currency} wird nicht unterstützt`)
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT || amount > MAX_PAYOUT) {
    throw new Error(`Betrag muss zwischen ${MIN_PAYOUT} und ${MAX_PAYOUT.toLocaleString('de-DE')} liegen`)
  }
  const sourceAmount = round2(amount)
  if (currency === 'ETB') return { amount: sourceAmount, currency, payoutAmount: sourceAmount, fee: 0, rate: 1 }

  const marketRate = await getMarketRate(currency, 'ETB')
  const fee = round2((sourceAmount * markupPercent()) / 100)
  const payoutAmount = round2((sourceAmount - fee) * marketRate)
  return { amount: sourceAmount, currency, payoutAmount, fee, rate: marketRate }
}

export function maskAccount(accountNumber: string) {
  return `••${accountNumber.slice(-4)}`
}

// Bucht ab, löst die Chapa-Auszahlung aus und bucht bei einem Fehler zurück.
export async function executePayout(params: {
  userId: string
  amount: number
  destination: PayoutDestination & { bankName: string }
  merchantPaymentId?: string
}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: params.userId } })
  const quote = await quotePayout(user.currency, params.amount)
  // Chapa erlaubt höchstens 36 Zeichen → UUID ohne Bindestriche (32) + Präfix
  const reference = `mp${randomUUID().replace(/-/g, '')}`
  const label = `Auszahlung an ${params.destination.bankName} ${maskAccount(params.destination.accountNumber)}`

  const payout = await prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: { id: user.id, balance: { gte: quote.amount } },
      data: { balance: { decrement: quote.amount } },
    })
    if (debited.count === 0) throw new Error('Nicht genügend Guthaben')

    return tx.payout.create({
      data: {
        userId: user.id,
        amount: quote.amount,
        currency: quote.currency,
        payoutAmount: quote.payoutAmount,
        fee: quote.fee,
        rate: quote.rate,
        bankCode: params.destination.bankCode,
        bankName: params.destination.bankName,
        accountNumber: params.destination.accountNumber,
        accountName: params.destination.accountName,
        reference,
        merchantPaymentId: params.merchantPaymentId,
      },
    })
  })

  const result = await createChapaTransfer({
    accountName: payout.accountName,
    accountNumber: payout.accountNumber,
    amount: payout.payoutAmount,
    bankCode: payout.bankCode,
    reference,
  }).catch((e) => ({ ok: false, status: 0, message: String(e?.message ?? e) }))

  if (!result.ok) {
    console.error('❌ Chapa-Auszahlung fehlgeschlagen:', result.status, result.message)
    const failed = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { balance: { increment: payout.amount } } })
      return tx.payout.update({
        where: { id: payout.id },
        data: { status: 'FAILED', failureReason: result.message || 'Von Chapa abgelehnt' },
      })
    })
    return failed
  }

  // Erfolgreich: im Verlauf wie eine Auszahlung anzeigen
  const done = await prisma.$transaction(async (tx) => {
    await tx.transfer.create({
      data: {
        amount: payout.amount,
        currency: payout.currency,
        senderId: user.id,
        recipientId: user.id,
        reference: label,
        status: 'WITHDRAWAL',
        completedAt: new Date(),
      },
    })
    return tx.payout.update({ where: { id: payout.id }, data: { status: 'SUCCESS' } })
  })

  await logAudit({
    userId: user.id,
    action: params.merchantPaymentId ? 'PAYOUT_AUTO_CHAPA' : 'PAYOUT_CHAPA',
    details: { payoutId: payout.id, amount: payout.amount, payoutAmount: payout.payoutAmount, bank: payout.bankName },
  }).catch((e) => console.error('Audit-Log fehlgeschlagen:', e))

  return done
}

// Händler mit Sofortauszahlung: nach einer bezahlten QR-Zahlung den Betrag direkt auszahlen
export async function autoPayoutForMerchantPayment(merchantId: string, merchantPaymentId: string, amount: number) {
  const account = await prisma.payoutAccount.findUnique({ where: { userId: merchantId } })
  if (!account?.autoPayout) return
  if (amount < MIN_PAYOUT || amount > MAX_PAYOUT) return
  try {
    await executePayout({
      userId: merchantId,
      amount,
      merchantPaymentId,
      destination: {
        bankCode: account.bankCode,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
      },
    })
  } catch (error) {
    console.error('❌ Sofortauszahlung fehlgeschlagen:', merchantPaymentId, error)
  }
}
