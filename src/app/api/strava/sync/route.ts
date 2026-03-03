import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { refreshTokenIfNeeded, fetchActivities, fetchActivityDetail } from '@/lib/strava';
import { mapStravaToSource, metersToMiles } from '@/lib/stravaMapping';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // Get the first stored credential (single-user app)
    const credential = await prisma.stravaCredential.findFirst();
    if (!credential) {
      return NextResponse.json({ error: 'Not connected to Strava' }, { status: 401 });
    }

    const clientId = process.env.STRAVA_CLIENT_ID!;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET!;

    // Refresh token if needed
    const tokens = await refreshTokenIfNeeded(
      {
        access_token: credential.accessToken,
        refresh_token: credential.refreshToken,
        expires_at: credential.expiresAt,
      },
      clientId,
      clientSecret,
    );

    // Update stored tokens if they changed
    if (tokens.access_token !== credential.accessToken) {
      await prisma.stravaCredential.update({
        where: { id: credential.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
        },
      });
    }

    // Fetch activities since start of this year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const afterEpoch = Math.floor(startOfYear.getTime() / 1000);

    let allActivities: Awaited<ReturnType<typeof fetchActivities>> = [];
    let page = 1;
    while (true) {
      const batch = await fetchActivities(tokens.access_token, afterEpoch, page);
      if (batch.length === 0) break;
      allActivities = allActivities.concat(batch);
      if (batch.length < 100) break;
      page++;
    }

    let synced = 0;
    let skipped = 0;
    let filtered = 0;

    for (const activity of allActivities) {
      // Check if already synced
      const existing = await prisma.workoutSession.findUnique({
        where: { stravaActivityId: BigInt(activity.id) },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Fetch detail for gear info if needed (list endpoint only returns gear_id, not gear name)
      let enrichedActivity = activity;
      if (!activity.gear && activity.gear_id) {
        try {
          enrichedActivity = await fetchActivityDetail(tokens.access_token, activity.id);
        } catch {
          // Use summary data if detail fetch fails
        }
      }

      // Map to source
      const mapped = mapStravaToSource(enrichedActivity);
      if (!mapped) {
        filtered++;
        continue;
      }

      const durationMinutes = Math.round(activity.moving_time / 60);
      if (durationMinutes < 1) continue;

      const miles = activity.distance > 0 ? metersToMiles(activity.distance) : undefined;

      // Parse date
      const workoutDate = new Date(activity.start_date);

      await prisma.workoutSession.create({
        data: {
          date: workoutDate,
          source: mapped.source,
          activity: mapped.activityType,
          minutes: durationMinutes,
          miles: miles && miles > 0 ? miles : null,
          weightLifted: null,
          notes: `Synced from Strava: ${activity.name}`,
          stravaActivityId: BigInt(activity.id),
        },
      });
      synced++;
    }

    return NextResponse.json({ synced, skipped, filtered, total: allActivities.length });
  } catch (error) {
    console.error('Strava sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

// GET: status check, with optional ?debug=1 to see raw activities
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('debug') === '1') {
    try {
      const credential = await prisma.stravaCredential.findFirst();
      if (!credential) return NextResponse.json({ error: 'Not connected' }, { status: 401 });
      const clientId = process.env.STRAVA_CLIENT_ID!;
      const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
      const tokens = await refreshTokenIfNeeded(
        { access_token: credential.accessToken, refresh_token: credential.refreshToken, expires_at: credential.expiresAt },
        clientId, clientSecret,
      );
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const activities = await fetchActivities(tokens.access_token, Math.floor(startOfYear.getTime() / 1000));
      const summary = activities.map((a: any) => ({
        id: a.id, name: a.name, sport_type: a.sport_type, gear_id: a.gear_id,
        gear_name: a.gear?.name ?? null, distance: a.distance, moving_time: a.moving_time,
        start_date: a.start_date, trainer: a.trainer,
      }));
      return NextResponse.json({ count: activities.length, activities: summary });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  try {
    const credential = await prisma.stravaCredential.findFirst();
    return NextResponse.json({
      connected: !!credential,
      athleteId: credential?.athleteId ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
