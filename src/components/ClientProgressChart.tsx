'use client'

import { ProgressChart } from './ProgressChart'
import { WorkoutSession } from '@/types/workout'

interface ClientProgressChartProps {
  year?: number
  sessions: WorkoutSession[]
  viewMode?: 'annual' | 'monthly' | 'custom'
  selectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: 'annual' | 'monthly' | 'custom') => void
}

export function ClientProgressChart(props: ClientProgressChartProps) {
  return <ProgressChart {...props} />
}