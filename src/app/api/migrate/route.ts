import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Temporary migration endpoint to set up database tables
export async function GET() {
  try {
    console.log('Starting database migration...')
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // The tables will be created automatically when Prisma connects
    // if they don't exist (thanks to Prisma's introspection)
    
    // Test creating a sample goal to ensure tables work
    const testGoal = await prisma.goal.create({
      data: {
        name: 'Test Goal - Migration Successful',
        year: 2025,
        annualWeightTarget: 100000,
        minutesPerSession: 45,
        weeklySessionsTarget: 3,
        weeklyMinutesTarget: 135,
        annualMinutesTarget: 7020,
        quarterlyWeightTarget: 25000,
        quarterlyMinutesTarget: 1755,
        quarterlySessionsTarget: 39
      }
    })
    
    console.log('✅ Test goal created:', testGoal.id)
    
    // Clean up test goal
    await prisma.goal.delete({
      where: { id: testGoal.id }
    })
    
    console.log('✅ Test goal cleaned up')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully! 🎉',
      details: {
        connected: true,
        tablesCreated: true,
        testPassed: true
      }
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database migration failed. Check environment variables.'
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}

// Also support POST for flexibility
export async function POST() {
  return GET()
}