import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
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
    
    // Create workout in database
    const newWorkout = await prisma.workoutSession.create({
      data: {
        date: new Date(date),
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