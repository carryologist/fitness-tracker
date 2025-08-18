import { WorkoutDashboard } from '@/components/WorkoutDashboard'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fitness Tracker</h1>
          <p className="text-gray-600 mt-2">Track your workouts, monitor progress, and achieve your goals</p>
        </div>
        <WorkoutDashboard />
      </div>
    </main>
  )
}