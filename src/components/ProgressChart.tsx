'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, eachMonthOfInterval } from 'date-fns'
import { BarChart3, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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

export function ProgressChart({ 
  sessions, 
  viewMode: initialViewMode = 'annual',
  selectedMonth: initialSelectedMonth = new Date(),
  selectedMonths = [],
  onMonthChange,
  onViewModeChange
}: ProgressChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const selectedMonthKeys = useMemo(() => selectedMonths.map(d => format(d, 'yyyy-MM')), [selectedMonths])
  
  const handleViewModeChange = (mode: 'annual' | 'monthly' | 'custom') => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }
  
  React.useEffect(() => {
    setSelectedMonth(initialSelectedMonth)
    if (initialViewMode === 'custom' && selectedMonthKeys.length === 0) {
      setViewMode('annual')
    } else {
      setViewMode(initialViewMode)
    }
  }, [initialSelectedMonth, initialViewMode, selectedMonthKeys.length])

  const handleMonthChange = (newMonth: Date) => {
    setSelectedMonth(newMonth)
    onMonthChange?.([newMonth])
  }

  const canGoNext = selectedMonth < startOfMonth(new Date())

  const chartData = useMemo(() => {
    if (viewMode === 'annual') {
      // Annual view - show monthly data
      const months = eachMonthOfInterval({
        start: new Date(2025, 0, 1),
        end: new Date(2025, 11, 31)
      })

      return months.map(month => {
        const monthSessions = sessions.filter(s => {
          const sessionDate = new Date(s.date)
          return sessionDate.getMonth() === month.getMonth() && 
                 sessionDate.getFullYear() === month.getFullYear()
        })

        const totalMinutes = monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
        const totalMiles = monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0)
        const totalWeight = monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)

        return {
          label: format(month, 'MMM yyyy'),
          minutes: totalMinutes,
          miles: totalMiles,
          weight: totalWeight
        }
      })
    } else if (viewMode === 'monthly') {
      // Monthly view - show daily data for selected month
      const days = eachDayOfInterval({
        start: startOfMonth(selectedMonth),
        end: endOfMonth(selectedMonth)
      })

      return days.map(day => {
        const daySessions = sessions.filter(s => {
          const sessionDate = new Date(s.date)
          return format(sessionDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        })

        const totalMinutes = daySessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
        const totalMiles = daySessions.reduce((sum, s) => sum + (s.miles || 0), 0)
        const totalWeight = daySessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)

        return {
          label: format(day, 'd'),
          minutes: totalMinutes,
          miles: totalMiles,
          weight: totalWeight
        }
      })
    } else {
      // Custom view - show data for selected months
      if (selectedMonths.length === 0) return []
      
      const sortedMonths = [...selectedMonths].sort((a, b) => a.getTime() - b.getTime())
      
      return sortedMonths.map(month => {
        const monthSessions = sessions.filter(s => {
          const sessionDate = new Date(s.date)
          return sessionDate.getMonth() === month.getMonth() && 
                 sessionDate.getFullYear() === month.getFullYear()
        })

        const totalMinutes = monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
        const totalMiles = monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0)
        const totalWeight = monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)

        return {
          label: format(month, 'MMM yyyy'),
          minutes: totalMinutes,
          miles: totalMiles,
          weight: totalWeight
        }
      })
    }
  }, [sessions, viewMode, selectedMonth, selectedMonths])

  const domains = useMemo(() => {
    if (chartData.length === 0) return { left: [0, 50], right: [0, 1000] }
    const minutesValues = chartData.map(d => d.minutes).filter(v => v > 0)
    const milesValues = chartData.map(d => d.miles).filter(v => v > 0)
    const leftValues = [...minutesValues, ...milesValues]
    const weightValues = chartData.map(d => d.weight).filter(v => v > 0)
    let leftMax = 50
    if (leftValues.length > 0) {
      const dataMax = Math.max(...leftValues)
      leftMax = Math.ceil(dataMax * 1.3)
      if (leftMax <= 10) leftMax = Math.ceil(leftMax / 2) * 2
      else if (leftMax <= 50) leftMax = Math.ceil(leftMax / 5) * 5
      else leftMax = Math.ceil(leftMax / 10) * 10
    }
    let rightMax = 1000
    if (weightValues.length > 0) {
      const dataMax = Math.max(...weightValues)
      rightMax = Math.ceil(dataMax * 1.3)
      if (rightMax <= 1000) rightMax = Math.ceil(rightMax / 100) * 100
      else if (rightMax <= 10000) rightMax = Math.ceil(rightMax / 1000) * 1000
      else rightMax = Math.ceil(rightMax / 10000) * 10000
    }
    return { left: [0, leftMax], right: [0, rightMax] }
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data to display. Add some workout sessions to see your progress!
      </div>
    )
  }

  const colors = {
    text: '#6b7280',
    grid: '#e5e7eb',
    tooltip: {
      bg: '#ffffff',
      border: '#e5e7eb'
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
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleMonthChange(subMonths(selectedMonth, 1))} 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => canGoNext && handleMonthChange(addMonths(selectedMonth, 1))} 
                className={`p-2 rounded-lg transition-colors ${
                  canGoNext 
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400' 
                    : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                }`} 
                title={canGoNext ? "Next month" : "Cannot go beyond current month"} 
                disabled={!canGoNext}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
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
        <ResponsiveContainer width="100%" height={mounted && isMobile ? 250 : 300}>
          <LineChart 
            data={chartData} 
            margin={{ 
              top: 5, 
              right: mounted && isMobile ? 5 : 30, 
              left: mounted && isMobile ? 0 : 20, 
              bottom: 5 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="label" 
              stroke={colors.text}
              tick={{ fontSize: mounted && isMobile ? 10 : 12 }}
              tickFormatter={formatXAxisTick}
              interval={mounted && isMobile && viewMode === 'annual' ? 0 : 'preserveStartEnd'}
              angle={mounted && isMobile && viewMode === 'annual' ? -45 : 0}
              textAnchor={mounted && isMobile && viewMode === 'annual' ? 'end' : 'middle'}
              height={mounted && isMobile && viewMode === 'annual' ? 50 : 30}
            />
            <YAxis 
              yAxisId="left" 
              stroke={colors.text}
              tick={{ fontSize: mounted && isMobile ? 10 : 12 }}
              width={mounted && isMobile ? 35 : 60}
              tickFormatter={(value) => mounted && isMobile ? `${value}` : formatNumber(value)}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={colors.text}
              tick={{ fontSize: mounted && isMobile ? 10 : 12 }}
              width={mounted && isMobile ? 40 : 60}
              tickFormatter={(value) => {
                if (mounted && isMobile) {
                  return value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toString()
                }
                return formatNumber(value)
              }}
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