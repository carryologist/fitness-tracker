'use client'

import dynamic from 'next/dynamic'
import { WorkoutSession } from './WorkoutDashboard'

interface ProgressChartProps {
  sessions: WorkoutSession[]
  initialViewMode?: 'annual' | 'monthly' | 'custom'
  initialSelectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: 'annual' | 'monthly' | 'custom') => void
}

// Loading placeholder that matches the expected size
const ChartLoading = () => (
  <div className="flex items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
  </div>
)

// Dynamic import with no SSR
const ProgressChart = dynamic(
  () => import('./ProgressChart').then(mod => ({ default: mod.ProgressChart })),
  {
    ssr: false,
    loading: ChartLoading
  }
)

export function ClientProgressChart(props: ProgressChartProps) {
  return <ProgressChart {...props} />
}