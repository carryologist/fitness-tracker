'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns'
import { BarChart3, Calendar } from 'lucide-react'
import { WorkoutSession } from './WorkoutDashboard'
import { formatNumber } from '../utils/numberFormat'

type ViewMode = 'annual' | 'monthly' | 'custom'

interface ProgressChartProps {
  sessions: WorkoutSession[]
  viewMode?: ViewMode
  selectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: ViewMode) => void
}

// Use a stable default date (Jan 1, 2025) to avoid hydration issues
const DEFAULT_DATE = new Date(2025, 0, 1)

export function ProgressChart({ 
  sessions, 
  viewMode: initialViewMode = 'annual',
  selectedMonth: initialSelectedMonth = DEFAULT_DATE,
  selectedMonths = [],
  onMonthChange,
  onViewModeChange
}: ProgressChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const selectedMonthKeys = useMemo(() => selectedMonths.map(d => format(d, 'yyyy-MM')), [selectedMonths])
  
  const handleViewModeChange = (mode: 'annual' | 'monthly' | 'custom') => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  const handleMonthClick = (month: Date) => {
    const monthKey = format(month, 'yyyy-MM')
    const isSelected = selectedMonthKeys.includes(monthKey)
    
    if (isSelected) {
      onMonthChange?.(selectedMonths.filter(m => format(m, 'yyyy-MM') !== monthKey))
    } else {
      onMonthChange?.([...selectedMonths, month])
    }
  }

  // Effect to sync external viewMode changes
  useEffect(() => {
    if (initialViewMode !== viewMode) {
      setViewMode(initialViewMode)
    }
  }, [initialViewMode])

  // Effect to sync external selectedMonth changes
  useEffect(() => {
    if (initialSelectedMonth !== selectedMonth) {
      setSelectedMonth(initialSelectedMonth)
    }
  }, [initialSelectedMonth])

  // Calculate chart data based on view mode
  const chartData = useMemo(() => {
    if (viewMode === 'annual') {
      // Group by month for annual view
      const monthlyData = new Map<string, { minutes: number, miles: number, weight: number }>()
      
      sessions.forEach(session => {
        const monthKey = format(new Date(session.date), 'MMM yyyy')
        const existing = monthlyData.get(monthKey) || { minutes: 0, miles: 0, weight: 0 }
        monthlyData.set(monthKey, {
          minutes: existing.minutes + (session.minutes || 0),
          miles: existing.miles + (session.miles || 0),
          weight: existing.weight + (session.weightLifted || 0)
        })
      })

      // Get all months in the year
      const currentYear = new Date().getFullYear()
      const months = eachMonthOfInterval({
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 11, 31)
      })

      return months.map(month => {
        const monthKey = format(month, 'MMM yyyy')
        const data = monthlyData.get(monthKey) || { minutes: 0, miles: 0, weight: 0 }
        return {
          label: format(month, 'MMM yyyy'),
          ...data
        }
      })
    } else if (viewMode === 'monthly') {
      // Group by day for monthly view
      const dailyData = new Map<string, { minutes: number, miles: number, weight: number }>()
      
      sessions.forEach(session => {
        const sessionDate = new Date(session.date)
        if (format(sessionDate, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')) {
          const dayKey = format(sessionDate, 'd')
          const existing = dailyData.get(dayKey) || { minutes: 0, miles: 0, weight: 0 }
          dailyData.set(dayKey, {
            minutes: existing.minutes + (session.minutes || 0),
            miles: existing.miles + (session.miles || 0),
            weight: existing.weight + (session.weightLifted || 0)
          })
        }
      })

      // Get all days in the selected month
      const days = eachDayOfInterval({
        start: startOfMonth(selectedMonth),
        end: endOfMonth(selectedMonth)
      })

      return days.map(day => {
        const dayKey = format(day, 'd')
        const data = dailyData.get(dayKey) || { minutes: 0, miles: 0, weight: 0 }
        return {
          label: dayKey,
          ...data
        }
      })
    } else {
      // Custom view - show selected months
      const monthlyData = new Map<string, { minutes: number, miles: number, weight: number }>()
      
      sessions.forEach(session => {
        const monthKey = format(new Date(session.date), 'MMM yyyy')
        if (selectedMonthKeys.includes(format(new Date(session.date), 'yyyy-MM'))) {
          const existing = monthlyData.get(monthKey) || { minutes: 0, miles: 0, weight: 0 }
          monthlyData.set(monthKey, {
            minutes: existing.minutes + (session.minutes || 0),
            miles: existing.miles + (session.miles || 0),
            weight: existing.weight + (session.weightLifted || 0)
          })
        }
      })

      return Array.from(monthlyData.entries()).map(([label, data]) => ({
        label,
        ...data
      }))
    }
  }, [sessions, viewMode, selectedMonth, selectedMonthKeys])

  const domains = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.minutes, d.miles, d.weight])
    return {
      min: Math.min(...allValues, 0),
      max: Math.max(...allValues, 1)
    }
  }, [chartData])

  // Theme colors
  const colors = {
    text: 'rgb(107 114 128)',
    grid: 'rgb(229 231 235)',
    tooltip: {
      bg: 'white',
      border: 'rgb(229 231 235)'
    }
  }

  // Format x-axis labels based on screen size
  const formatXAxisTick = (value: string) => {
    if (viewMode === 'annual') {
      // Always show abbreviated month names for consistency
      const monthMap: Record<string, string> = {
        'Jan 2025': 'Jan',
        'Feb 2025': 'Feb', 
        'Mar 2025': 'Mar',
        'Apr 2025': 'Apr',
        'May 2025': 'May',
        'Jun 2025': 'Jun',
        'Jul 2025': 'Jul',
        'Aug 2025': 'Aug',
        'Sep 2025': 'Sep',
        'Oct 2025': 'Oct',
        'Nov 2025': 'Nov',
        'Dec 2025': 'Dec'
      }
      return monthMap[value] || value.replace(' 2025', '')
    }
    // For daily view, always show day number
    return value
  }

  // Don't render chart on server
  if (!mounted) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data to display. Add some workout sessions to see your progress!
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {viewMode === 'annual' ? 'Annual Progress by Month' : 
               viewMode === 'monthly' ? `${format(selectedMonth, 'MMMM yyyy')} Daily Progress` :
               'Custom Period Progress'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your fitness journey {viewMode === 'annual' ? 'over the year' : 
                                   viewMode === 'monthly' ? 'this month' : 
                                   'for selected months'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewModeChange('annual')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${viewMode === 'annual' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800' 
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            Annual
          </button>
          <button
            onClick={() => handleViewModeChange('monthly')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${viewMode === 'monthly' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800' 
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <Calendar className="w-4 h-4" />
            Monthly
          </button>
          <button
            onClick={() => handleViewModeChange('custom')}
            disabled={selectedMonthKeys.length < 2}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${viewMode === 'custom' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800' 
                : selectedMonthKeys.length < 2
                  ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-2 border-transparent cursor-not-allowed'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            Custom
          </button>
        </div>
      </div>
      
      <div className="mt-6">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart 
            data={chartData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="label" 
              stroke={colors.text}
              tick={{ fontSize: 12 }}
              tickFormatter={formatXAxisTick}
            />
            <YAxis 
              yAxisId="left" 
              stroke={colors.text}
              tick={{ fontSize: 12 }}
              width={60}
              tickFormatter={(value) => formatNumber(value)}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={colors.text}
              tick={{ fontSize: 12 }}
              width={60}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: colors.tooltip.bg,
                border: `1px solid ${colors.tooltip.border}`,
                borderRadius: '0.375rem'
              }}
              labelStyle={{ color: colors.text }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => <span style={{ color: colors.text }}>{value}</span>}
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="miles" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Miles"
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="minutes" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Minutes"
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="weight" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Weight Lifted (lbs)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}