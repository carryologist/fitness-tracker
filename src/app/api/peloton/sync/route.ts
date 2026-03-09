import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchPelotonWorkouts, fetchPelotonWorkoutSummary, mapPelotonWorkout } from '@/lib/peloton';

const prisma = new PrismaClient();

// GET: check connection status
export async function GET() {
  try {
    const credential = await prisma.pelotonCredential.findFirst();
    return NextResponse.json({
      connected: !!credential,
      userId: credential?.userId ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false, userId: null });
  }
}

// POST: sync workouts from Peloton
export async function POST() {
  try {
    const credential = await prisma.pelotonCredential.findFirst();
    if (!credential) {
      return NextResponse.json(
        { error: 'Not connected to Peloton. Call POST /api/peloton/auth first.' },
        { status: 401 },
      );
    }

    const { sessionId, userId } = credential;

    let synced = 0;
    let skipped = 0;
    let updated = 0;
    let total = 0;
    let page = 0;

    // Page through all workouts
    while (true) {
      const response = await fetchPelotonWorkouts(sessionId, userId, page);
      const workouts = response.data;
      total += workouts.length;

      if (workouts.length === 0) break;

      for (const workout of workouts) {
        // Only sync completed workouts
        if (workout.status !== 'COMPLETE') {
          skipped++;
          continue;
        }

        // Check if already synced by pelotonWorkoutId
        const existing = await prisma.workoutSession.findFirst({
          where: { pelotonWorkoutId: workout.id },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // Fetch detailed summary if not included in list response
        if (!workout.overall_summary) {
          try {
            workout.overall_summary = await fetchPelotonWorkoutSummary(sessionId, workout.id);
          } catch {
            // Continue without summary data
          }
        }

        const mapped = mapPelotonWorkout(workout);

        if (mapped.minutes < 1) {
          skipped++;
          continue;
        }

        // Check for a manually-entered row matching date + source that
        // is missing pelotonWorkoutId (backfill miles/notes & link it)
        const startOfDay = new Date(mapped.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(mapped.date);
        endOfDay.setHours(23, 59, 59, 999);

        const manualMatch = await prisma.workoutSession.findFirst({
          where: {
            source: mapped.source,
            pelotonWorkoutId: null,
            date: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (manualMatch) {
          await prisma.workoutSession.update({
            where: { id: manualMatch.id },
            data: {
              miles: mapped.miles ?? manualMatch.miles,
              notes: mapped.notes ?? manualMatch.notes,
              pelotonWorkoutId: mapped.pelotonWorkoutId,
            },
          });
          updated++;
          continue;
        }

        await prisma.workoutSession.create({
          data: {
            date: mapped.date,
            source: mapped.source,
            activity: mapped.activity,
            minutes: mapped.minutes,
            miles: mapped.miles ?? null,
            weightLifted: null,
            notes: mapped.notes ?? null,
            pelotonWorkoutId: mapped.pelotonWorkoutId,
          },
        });
        synced++;
      }

      // Stop if we've fetched the last page
      if (page + 1 >= response.page_count) break;
      page++;
    }

    return NextResponse.json({ synced, updated, skipped, total });
  } catch (error) {
    console.error('Peloton sync error:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: disconnect Peloton (clear stored credentials)
export async function DELETE() {
  try {
    await prisma.pelotonCredential.deleteMany();
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error('Failed to disconnect Peloton:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
