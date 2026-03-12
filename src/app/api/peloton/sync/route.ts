import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchPelotonWorkouts, fetchPelotonWorkoutSummary, mapPelotonWorkout, refreshPelotonCredential } from '@/lib/peloton';

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

/**
 * Return a valid sessionId + userId, re-authenticating if the token is
 * expired or missing.  Called once before the sync loop starts.
 */
async function getValidCredential(): Promise<{ sessionId: string; userId: string }> {
  const credential = await prisma.pelotonCredential.findFirst();

  if (!credential) {
    // No credential at all — do a fresh auth
    return refreshPelotonCredential();
  }

  // Proactively refresh if expiresAt is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (credential.expiresAt && credential.expiresAt < now + 300) {
    console.log('Peloton token expired or expiring soon, refreshing…');
    return refreshPelotonCredential();
  }

  return { sessionId: credential.sessionId, userId: credential.userId };
}

// POST: sync workouts from Peloton
export async function POST(req: Request) {
  try {
    let { sessionId, userId } = await getValidCredential();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '200');
    const maxPages = Math.ceil(limit / 50);

    let synced = 0;
    let skipped = 0;
    let updated = 0;
    let total = 0;
    let page = 0;
    let consecutiveSkips = 0;
    let caughtUp = false;
    let retriedAuth = false;

    // Page through workouts (newest first) until we catch up
    while (!caughtUp) {
      let response;
      try {
        response = await fetchPelotonWorkouts(sessionId, userId, page);
      } catch (err) {
        // If 401 and we haven't retried yet, re-auth and try once more
        if (!retriedAuth && err instanceof Error && err.message.includes('(401)')) {
          console.log('Peloton 401 during sync, re-authenticating…');
          const fresh = await refreshPelotonCredential();
          sessionId = fresh.sessionId;
          userId = fresh.userId;
          retriedAuth = true;
          response = await fetchPelotonWorkouts(sessionId, userId, page);
        } else {
          throw err;
        }
      }
      const workouts = response.data;
      total += workouts.length;

      if (workouts.length === 0) break;

      let newOnThisPage = false;

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
          consecutiveSkips++;

          // After 5 consecutive already-synced workouts, we've caught up
          if (consecutiveSkips >= 5) {
            caughtUp = true;
            break;
          }
          continue;
        }

        // New workout — reset consecutive skip counter
        consecutiveSkips = 0;
        newOnThisPage = true;

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

      // If no new workouts on this page, everything older is synced too
      if (!newOnThisPage && !caughtUp) {
        caughtUp = true;
        break;
      }

      // Stop if we've fetched the last page or hit the page cap
      if (page + 1 >= response.page_count) break;
      if (page + 1 >= maxPages) break;
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
