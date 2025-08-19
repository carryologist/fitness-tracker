import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Migration endpoint to set up database tables
export async function GET() {
  try {
    console.log('🚀 Starting database migration...')
    
    // Step 1: Connect to database
    console.log('🔌 Connecting to database...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Step 2: Create tables using raw SQL
    console.log('📋 Creating database tables...')
    
    // Create goals table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "goals" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "annualWeightTarget" DOUBLE PRECISION NOT NULL,
        "minutesPerSession" INTEGER NOT NULL,
        "weeklySessionsTarget" INTEGER NOT NULL,
        "weeklyMinutesTarget" INTEGER NOT NULL,
        "annualMinutesTarget" INTEGER NOT NULL,
        "quarterlyWeightTarget" DOUBLE PRECISION NOT NULL,
        "quarterlyMinutesTarget" INTEGER NOT NULL,
        "quarterlySessionsTarget" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
      )
    `
    
    // Create workout_sessions table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "workout_sessions" (
        "id" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "source" TEXT NOT NULL,
        "activity" TEXT NOT NULL,
        "minutes" INTEGER NOT NULL,
        "miles" DOUBLE PRECISION,
        "weightLifted" DOUBLE PRECISION,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
      )
    `
    
    // Create monthly_summaries table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "monthly_summaries" (
        "id" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "totalMinutes" INTEGER NOT NULL,
        "totalMiles" DOUBLE PRECISION NOT NULL,
        "totalSessions" INTEGER NOT NULL,
        "averageWeight" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "monthly_summaries_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "monthly_summaries_year_month_key" UNIQUE ("year", "month")
      )
    `
    
    console.log('✅ Database tables created successfully')
    
    // Step 3: Test table creation with a sample goal
    console.log('🧪 Testing goal creation...')
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
    
    // Step 4: Clean up test goal
    await prisma.goal.delete({
      where: { id: testGoal.id }
    })
    
    console.log('✅ Test goal cleaned up')
    console.log('🎉 Migration completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully! 🎉',
      details: {
        tablesCreated: ['goals', 'workout_sessions', 'monthly_summaries'],
        connected: true,
        testPassed: true
      }
    })
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database migration failed. Check environment variables and database connection.',
      troubleshooting: {
        checkDatabaseUrl: 'Ensure POSTGRES_PRISMA_URL is set correctly',
        checkConnection: 'Verify database is accessible from Vercel',
        checkPermissions: 'Ensure database user has CREATE TABLE permissions'
      }
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}

// Also support POST for flexibility
export async function POST() {
  return GET()
}