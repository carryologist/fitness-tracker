'use client'

import dynamic from 'next/dynamic'
import { WorkoutSession } from './WorkoutDashboard'

interface ClientProgressChartProps {
  sessions: WorkoutSession[]
  initialViewMode?: 'annual' | 'monthly' | 'custom'
  initialSelectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: 'annual' | 'monthly' | 'custom') => void
}

// Dynamically import ProgressChart with SSR disabled
const ProgressChart = dynamic(
  () => import('./ProgressChart').then(mod => mod.ProgressChart),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }
)

export function ClientProgressChart(props: ClientProgressChartProps) {
  return <ProgressChart {...props} />
}