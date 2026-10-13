import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/** Serialize sync writes across serverless instances, without holding a
 * transaction open during upstream requests. Roll back incomplete merges. */
export function withSyncWrite<T>(write: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    // All integrations share this key because Peloton and Tonal can link rows.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(782341, 1)`
    return write(tx)
  }, { maxWait: 10_000, timeout: 15_000 })
}

export class SyncInputError extends Error {}

export function validateSyncLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 2000) {
    throw new SyncInputError('Sync limit must be an integer between 1 and 2000')
  }
}
