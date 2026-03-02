import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { refreshTokenIfNeeded, fetchActivityDetail } from '../../../../../shared/strava';
import { mapStravaToSource, metersToMiles } from '../../../../../shared/stravaMapping';

const prisma = new PrismaClient();

// Webhook validation (Strava sends GET to verify subscription)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Webhook event handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { object_type, object_id, aspect_type, owner_id } = body;

    // Only handle activity events
    if (object_type !== 'activity') {
      return NextResponse.json({ ok: true });
    }

    // Handle delete
    if (aspect_type === 'delete') {
      await prisma.workoutSession.deleteMany({
        where: { stravaActivityId: BigInt(object_id) },
      });
      return NextResponse.json({ ok: true });
    }

    // Handle create/update — fetch activity detail and upsert
    const credential = await prisma.stravaCredential.findUnique({
      where: { athleteId: owner_id },
    });
    if (!credential) {
      return NextResponse.json({ ok: true }); // Unknown athlete
    }

    const clientId = process.env.STRAVA_CLIENT_ID!;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET!;

    const tokens = await refreshTokenIfNeeded(
      {
        access_token: credential.accessToken,
        refresh_token: credential.refreshToken,
        expires_at: credential.expiresAt,
      },
      clientId,
      clientSecret,
    );

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

    const activity = await fetchActivityDetail(tokens.access_token, object_id);
    const mapped = mapStravaToSource(activity);
    if (!mapped) {
      return NextResponse.json({ ok: true }); // Filtered out
    }

    const durationMinutes = Math.round(activity.moving_time / 60);
    if (durationMinutes < 1) {
      return NextResponse.json({ ok: true });
    }

    const miles = activity.distance > 0 ? metersToMiles(activity.distance) : null;

    const data = {
      date: new Date(activity.start_date),
      source: mapped.source,
      activity: mapped.activityType,
      minutes: durationMinutes,
      miles: miles && miles > 0 ? miles : null,
      weightLifted: null as number | null,
      notes: `Synced from Strava: ${activity.name}`,
      stravaActivityId: BigInt(activity.id),
    };

    // Upsert: create or update
    const existing = await prisma.workoutSession.findUnique({
      where: { stravaActivityId: BigInt(activity.id) },
    });

    if (existing) {
      await prisma.workoutSession.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.workoutSession.create({ data });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Strava webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 for webhooks
  }
}
