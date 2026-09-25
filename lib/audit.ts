import { prisma } from './prisma'

export async function logAudit({
  userId,
  action,
  details,
  ipAddress,
  userAgent
}: {
  userId: string
  action: string
  details?: any
  ipAddress?: string
  userAgent?: string
}) {
  // ⚠️ Keine sensiblen Daten speichern!
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
      createdAt: new Date()
    }
  })
}