'use client'

import { WorkoutDashboard } from '@/components/WorkoutDashboard'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <WorkoutDashboard />
    </main>
  )
}