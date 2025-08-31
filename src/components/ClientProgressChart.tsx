'use client'

import { ProgressChart } from './ProgressChart'
import { WorkoutSession } from './WorkoutDashboard'

interface ClientProgressChartProps {
  sessions: WorkoutSession[]
  initialViewMode?: 'annual' | 'monthly' | 'custom'
  initialSelectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: 'annual' | 'monthly' | 'custom') => void
}

export function ClientProgressChart(props: ClientProgressChartProps) {
  return <ProgressChart {...props} />
}