import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

// Migration endpoint to set up database tables
export async function GET() {
  try {
    console.log('🚀 Starting database migration...')
    
    // Step 1: Push schema to database (creates tables)
    console.log('📋 Creating database tables...')
    try {
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'pipe',
        cwd: process.cwd()
      })
      console.log('✅ Database tables created successfully')
    } catch (schemaError) {
      console.error('❌ Schema push failed:', schemaError)
      return NextResponse.json({
        success: false,
        error: `Schema migration failed: ${schemaError}`,
        message: 'Failed to create database tables. Check database connection.'
      }, { status: 500 })
    }
    
    // Step 2: Test connection
    console.log('🔌 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
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
        schemaApplied: true,
        connected: true,
        tablesCreated: true,
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