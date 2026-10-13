import prisma from '@/lib/prisma'
import { Prisma, type BodyMeasurement } from '@prisma/client'
import { withSyncWrite } from '@/lib/sync-write'
import type { MappedBodyMeasurement } from '@/lib/renpho'

const fields = ['weightLbs', 'bmi', 'bodyFatPct', 'waterPct', 'musclePct', 'boneMassPct', 'bmr',
  'visceralFatLevel', 'subcutaneousFatPct', 'proteinPct', 'bodyAgeYears', 'leanBodyMassLbs',
  'fatFreeWeightLbs', 'heartRateBpm', 'renphoRecordId'] as const
function changed(reading: MappedBodyMeasurement, existing?: BodyMeasurement): boolean {
  return !existing || fields.some(key => reading[key] !== undefined && reading[key] !== existing[key])
}
function data(reading: MappedBodyMeasurement) {
  return { weightLbs: reading.weightLbs, ...Object.fromEntries(fields.filter(key => reading[key] !== undefined).map(key => [key, reading[key]])) }
}

/** One read on unchanged syncs; short, locked bulk writes only for differences. */
export async function persistRenphoReadings(readings: MappedBodyMeasurement[]) {
  if (!readings.length) return { synced: 0, updated: 0, skipped: 0 }
  const existing = await prisma.bodyMeasurement.findMany({ where: { date: { in: readings.map(r => r.date) } } })
  const byDate = new Map(existing.map(row => [row.date.getTime(), row]))
  const pending = readings.filter(reading => changed(reading, byDate.get(reading.date.getTime())))
  let synced = 0, updated = 0, skipped = readings.length - pending.length
  for (let offset = 0; offset < pending.length; offset += 100) {
    const batch = pending.slice(offset, offset + 100)
    const counts = await withSyncWrite(async tx => {
      // Another call may have imported this batch after our initial comparison.
      const current = await tx.bodyMeasurement.findMany({ where: { date: { in: batch.map(r => r.date) } } })
      const currentByDate = new Map(current.map(row => [row.date.getTime(), row]))
      const creates = batch.filter(r => !currentByDate.has(r.date.getTime()))
      const updates = batch.filter(r => currentByDate.has(r.date.getTime()) && changed(r, currentByDate.get(r.date.getTime())))
      if (creates.length) await tx.bodyMeasurement.createMany({ data: creates.map(r => ({ date: r.date, source: 'Renpho', ...data(r) })) })
      if (updates.length) {
        const payload = updates.map(r => ({ date: r.date.toISOString(), data: data(r) }))
        const assignments = fields.map(key => Prisma.sql`${Prisma.raw(`"${key}"`)} = CASE
          WHEN entry->'data' ? ${key} THEN (entry->'data'->>${key})::${Prisma.raw(key === 'renphoRecordId' ? 'text' : 'double precision')}
          ELSE measurements.${Prisma.raw(`"${key}"`)} END`)
        await tx.$executeRaw(Prisma.sql`UPDATE body_measurements AS measurements SET
          ${Prisma.join(assignments)}, "updatedAt" = timezone('UTC', NOW())
          FROM jsonb_array_elements(${JSON.stringify(payload)}::jsonb) AS payload(entry)
          WHERE measurements.date = (entry->>'date')::timestamp`)
      }
      return { synced: creates.length, updated: updates.length, skipped: batch.length - creates.length - updates.length }
    }, 'measurements')
    synced += counts.synced; updated += counts.updated; skipped += counts.skipped
  }
  return { synced, updated, skipped }
}
