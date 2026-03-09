import { NextResponse } from 'next/server'
import Tesseract from 'tesseract.js'
import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

interface ParsedTonal {
  weightLifted: number | null
  minutes: number | null
  date: Date | null
  notes: string
  workoutName: string | null
  detailsLine: string | null
}

function parseTonalImage(text: string): ParsedTonal {
  // Clean up OCR artifacts
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Volume: look for number followed by "lbs"
  const volumeMatch = text.match(/([\d,]+)\s*lbs/i)
  const weightLifted = volumeMatch
    ? parseInt(volumeMatch[1].replace(/,/g, ''), 10)
    : null

  // Duration: look for MM:SS pattern
  const durationMatch = text.match(/(\d{1,3}):(\d{2})/)
  const minutes = durationMatch
    ? parseInt(durationMatch[1], 10) +
      (parseInt(durationMatch[2], 10) > 0 ? 1 : 0)
    : null

  // Date: look for M/D/YY pattern (after | or at end)
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  let date: Date | null = null
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10)
    const day = parseInt(dateMatch[2], 10)
    let year = parseInt(dateMatch[3], 10)
    if (year < 100) year += 2000
    date = new Date(year, month - 1, day, 12, 0, 0) // noon to avoid timezone issues
  }

  // Workout name: first line that's not "TONAL" and not an all-caps label
  const workoutName =
    lines.find(
      (l) =>
        l.length > 3 &&
        !l.match(/^TONAL$/i) &&
        !l.match(/^VOLUME$/i) &&
        !l.match(/^DURATION$/i) &&
        !l.match(/^\d/) &&
        !l.includes('|') &&
        !l.includes('lbs'),
    ) || null

  // Coach/details: line with bullet separators
  const detailsLine =
    lines.find((l) => l.includes('•') || l.includes('·')) || null

  const notes = [workoutName, detailsLine].filter(Boolean).join(' — ')

  return { weightLifted, minutes, date, notes, workoutName, detailsLine }
}

// ---------------------------------------------------------------------------
// POST /api/tonal/import
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // ---- 1. Read the uploaded image from multipart/form-data ----
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided. Send as "image" field in multipart/form-data.' },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ---- 2. Run OCR via Tesseract.js ----
    const {
      data: { text: rawText },
    } = await Tesseract.recognize(buffer as unknown as string, 'eng')

    // ---- 3. Parse the OCR text ----
    const parsed = parseTonalImage(rawText)

    if (!parsed.date) {
      return NextResponse.json(
        { success: false, error: 'Could not parse date from image', rawText },
        { status: 422 },
      )
    }

    if (!parsed.minutes) {
      return NextResponse.json(
        { success: false, error: 'Could not parse duration from image', rawText },
        { status: 422 },
      )
    }

    // ---- 4. Check for duplicate imports ----
    const startOfDay = new Date(parsed.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(parsed.date)
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.workoutSession.findFirst({
      where: {
        source: 'Tonal',
        date: { gte: startOfDay, lte: endOfDay },
        minutes: parsed.minutes,
      },
    })

    if (existing) {
      // If the existing entry is missing weight data, update it
      if (!existing.weightLifted && parsed.weightLifted) {
        const updated = await prisma.workoutSession.update({
          where: { id: existing.id },
          data: {
            weightLifted: parsed.weightLifted,
            notes: parsed.notes || existing.notes,
          },
        })
        return NextResponse.json({
          success: true,
          updated: true,
          workout: {
            id: updated.id,
            date: updated.date,
            minutes: updated.minutes,
            weightLifted: updated.weightLifted,
            notes: updated.notes,
          },
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Workout already exists for this date',
          duplicate: true,
        },
        { status: 409 },
      )
    }

    // ---- 5. Create WorkoutSession ----
    const workout = await prisma.workoutSession.create({
      data: {
        source: 'Tonal',
        activity: 'Weight Lifting',
        date: parsed.date,
        minutes: parsed.minutes,
        weightLifted: parsed.weightLifted ?? undefined,
        notes: parsed.notes || null,
        tonalWorkoutId: null,
      },
    })

    return NextResponse.json({
      success: true,
      workout: {
        id: workout.id,
        date: workout.date,
        minutes: workout.minutes,
        weightLifted: workout.weightLifted,
        notes: workout.notes,
      },
    })
  } catch (error) {
    console.error('💥 Tonal import error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message, rawText: '' },
      { status: 500 },
    )
  }
}
