import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

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

    const incoming = new Date(date)
    const normalized = new Date(Date.UTC(incoming.getUTCFullYear(), incoming.getUTCMonth(), incoming.getUTCDate()))
    
    // Create workout in database
    const newWorkout = await prisma.workoutSession.create({
      data: {
        date: normalized,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, source, activity, minutes, miles, weightLifted, notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Workout ID is required' },
        { status: 400 }
      )
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
    if (date) {
      const incoming = new Date(date)
      updateData.date = new Date(Date.UTC(incoming.getUTCFullYear(), incoming.getUTCMonth(), incoming.getUTCDate()))
    }
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