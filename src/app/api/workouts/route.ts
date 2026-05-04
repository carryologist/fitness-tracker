import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAuth } from '@/lib/auth'

export async function GET() {
  await checkAuth()

  try {
    console.log('📊 Fetching workouts from database...')
    
    // Fetch all workout sessions from database
    const workouts = await prisma.workoutSession.findMany({
      orderBy: {
        date: 'desc'
      }
    })
    
    console.log(`✅ Found ${workouts.length} workouts`)
    
    // Transform to match frontend expectations
    const transformedWorkouts = workouts.map(workout => ({
      id: workout.id,
      date: workout.date,
      source: workout.source,
      activity: workout.activity,
      minutes: workout.minutes,
      miles: workout.miles,
      weightLifted: workout.weightLifted,
      notes: workout.notes,
      createdAt: workout.createdAt,
      updatedAt: workout.updatedAt
    }))

    return NextResponse.json({ workouts: transformedWorkouts })
  } catch (error) {
    console.error('💥 Error fetching workouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  await checkAuth()

  try {
    const body = await request.json()
    console.log('💪 Creating new workout:', body)
    
    // Validate required fields
    const { date, source, activity, minutes, miles, weightLifted, notes } = body
    
    if (!date || !source || !activity || minutes === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, source, activity, minutes' },
        { status: 400 }
      )
    }

    const parsedMinutes = parseInt(minutes)
    if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 1440) {
      return NextResponse.json(
        { error: 'minutes must be between 0 and 1440' },
        { status: 400 }
      )
    }
    if (miles !== undefined && miles !== null) {
      const parsedMiles = parseFloat(miles)
      if (isNaN(parsedMiles) || parsedMiles < 0 || parsedMiles > 500) {
        return NextResponse.json(
          { error: 'miles must be between 0 and 500' },
          { status: 400 }
        )
      }
    }
    if (weightLifted !== undefined && weightLifted !== null) {
      const parsedWeight = parseFloat(weightLifted)
      if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 200000) {
        return NextResponse.json(
          { error: 'weightLifted must be between 0 and 200000' },
          { status: 400 }
        )
      }
    }

    // Create workout in database
    // Parse date - handle both ISO timestamps and date-only strings
    const workoutDate = date.includes('T') 
      ? new Date(date)  // Full ISO timestamp
      : new Date(date + 'T12:00:00')  // Date-only string from manual entry
    const newWorkout = await prisma.workoutSession.create({
      data: {
        date: workoutDate,
        source: source,
        activity: activity,
        minutes: parseInt(minutes),
        miles: miles ? parseFloat(miles) : null,
        weightLifted: weightLifted ? parseFloat(weightLifted) : null,
        notes: notes || null
      }
    })
    
    console.log('✅ Workout created successfully:', newWorkout.id)
    
    return NextResponse.json({ workout: newWorkout }, { status: 201 })
  } catch (error) {
    console.error('💥 Error creating workout:', error)
    
    // Handle duplicate entry errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Workout already exists for this date and activity' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  await checkAuth()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workout ID is required' },
        { status: 400 }
      )
    }
    
    console.log('🗑️ Deleting workout:', id)
    
    await prisma.workoutSession.delete({
      where: { id }
    })
    
    console.log('✅ Workout deleted successfully')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('💥 Error deleting workout:', error)
    return NextResponse.json(
      { error: 'Failed to delete workout' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  await checkAuth()

  try {
    const body = await request.json()
    const { id, date, source, activity, minutes, miles, weightLifted, notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Workout ID is required' },
        { status: 400 }
      )
    }

    if (minutes !== undefined) {
      const parsedMinutes = parseInt(minutes)
      if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 1440) {
        return NextResponse.json(
          { error: 'minutes must be between 0 and 1440' },
          { status: 400 }
        )
      }
    }
    if (miles !== undefined && miles !== null) {
      const parsedMiles = parseFloat(miles)
      if (isNaN(parsedMiles) || parsedMiles < 0 || parsedMiles > 500) {
        return NextResponse.json(
          { error: 'miles must be between 0 and 500' },
          { status: 400 }
        )
      }
    }
    if (weightLifted !== undefined && weightLifted !== null) {
      const parsedWeight = parseFloat(weightLifted)
      if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 200000) {
        return NextResponse.json(
          { error: 'weightLifted must be between 0 and 200000' },
          { status: 400 }
        )
      }
    }

    const updateData: {
      date?: Date
      source?: string
      activity?: string
      minutes?: number
      miles?: number | null
      weightLifted?: number | null
      notes?: string | null
    } = {}
    if (date) updateData.date = new Date(date + 'T12:00:00')
    if (source !== undefined) updateData.source = String(source)
    if (activity !== undefined) updateData.activity = String(activity)
    if (minutes !== undefined) updateData.minutes = parseInt(minutes)
    if (miles !== undefined) updateData.miles = miles === null ? null : parseFloat(miles)
    if (weightLifted !== undefined) updateData.weightLifted = weightLifted === null ? null : parseFloat(weightLifted)
    if (notes !== undefined) updateData.notes = notes || null

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ workout: updated })
  } catch (error) {
    console.error('💥 Error updating workout:', error)
    return NextResponse.json(
      { error: 'Failed to update workout' },
      { status: 500 }
    )
  }
}