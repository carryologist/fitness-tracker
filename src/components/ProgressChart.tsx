'use client'

import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { WorkoutSession } from './WorkoutDashboard'
import { format, startOfMonth, eachMonthOfInterval, min, max, eachDayOfInterval, endOfMonth, addMonths, subMonths } from 'date-fns'
import { Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface ProgressChartProps {
  sessions: WorkoutSession[]
  initialViewMode?: 'annual' | 'monthly' | 'custom'
  initialSelectedMonth?: Date
  selectedMonths?: Date[]
  onMonthChange?: (months: Date[]) => void
  onViewModeChange?: (mode: 'annual' | 'monthly' | 'custom') => void
}

export function ProgressChart({ 
  sessions, 
  initialViewMode = 'annual',
  initialSelectedMonth = new Date(),
  selectedMonths = [],
  onMonthChange,
  onViewModeChange
}: ProgressChartProps) {
  const [viewMode, setViewMode] = useState<'annual' | 'monthly' | 'custom'>(initialViewMode)
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth)
  
  // Check if we're in a dark mode by looking at the document class
  const [isDark, setIsDark] = useState(false)
  
  React.useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'))
      }
    }
    
    checkTheme()
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme)
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }
    
    return () => observer.disconnect()
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

  const currentMonth = new Date()
  const isCurrentOrFutureMonth = selectedMonth >= startOfMonth(currentMonth)
  const canGoNext = !isCurrentOrFutureMonth

  const chartData = useMemo(() => {
    if (sessions.length === 0) return []

    // Fallback: no custom months selected => treat as annual
    if (viewMode === 'custom' && selectedMonthKeys.length === 0) {
      const dates = sessions.map(s => s.date)
      const minDate = min(dates)
      const maxDate = max(dates)
      const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: startOfMonth(maxDate) })
      return months.map(month => {
        const monthKey = format(month, 'yyyy-MM')
        const monthSessions = sessions.filter(session => format(session.date, 'yyyy-MM') === monthKey)
        return {
          period: format(month, 'MMM yyyy'),
          minutes: monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    }

    if (viewMode === 'custom' && selectedMonthKeys.length === 1) {
      const onlyMonth = selectedMonths[0]
      const monthStart = startOfMonth(onlyMonth)
      const monthEnd = endOfMonth(onlyMonth)
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
      return days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const daySessions = sessions.filter(session => format(session.date, 'yyyy-MM-dd') === dayKey)
        return {
          period: format(day, 'd'),
          minutes: daySessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: daySessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: daySessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    }

    if (viewMode === 'custom' && selectedMonthKeys.length > 1) {
      const dates = sessions.map(s => s.date)
      const minDate = min(dates)
      const maxDate = max(dates)
      const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: startOfMonth(maxDate) })
      return months
        .filter(m => selectedMonthKeys.includes(format(m, 'yyyy-MM')))
        .map(month => {
          const monthKey = format(month, 'yyyy-MM')
          const monthSessions = sessions.filter(session => format(session.date, 'yyyy-MM') === monthKey)
          return {
            period: format(month, 'MMM yyyy'),
            minutes: monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
            miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
            weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
          }
        })
    }

    if (viewMode === 'annual') {
      const dates = sessions.map(s => s.date)
      const minDate = min(dates)
      const maxDate = max(dates)
      const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: startOfMonth(maxDate) })
      return months.map(month => {
        const monthKey = format(month, 'yyyy-MM')
        const monthSessions = sessions.filter(session => format(session.date, 'yyyy-MM') === monthKey)
        return {
          period: format(month, 'MMM yyyy'),
          minutes: monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    } else {
      const monthStart = startOfMonth(selectedMonth)
      const monthEnd = endOfMonth(selectedMonth)
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
      return days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const daySessions = sessions.filter(session => format(session.date, 'yyyy-MM-dd') === dayKey)
        return {
          period: format(day, 'd'),
          minutes: daySessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: daySessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: daySessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    }
  }, [sessions, viewMode, selectedMonth, selectedMonthKeys, selectedMonths])

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

  const chartColors = {
    text: isDark ? '#9ca3af' : '#6b7280',
    grid: isDark ? '#374151' : '#e5e7eb',
    tooltip: {
      bg: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? '#374151' : '#e5e7eb'
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 flex-shrink-0 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {viewMode === 'annual' ? 'Annual Progress by Month' : viewMode === 'custom' ? 'Custom Period' : `${format(selectedMonth, 'MMMM yyyy')} Daily Progress`}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {viewMode === 'annual' ? 'Your fitness journey over the year' : viewMode === 'custom' ? 'Aggregated over selected months' : 'Daily activity for the month'}
            </p>
          </div>
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleMonthChange(subMonths(selectedMonth, 1))} className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="Previous month">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => canGoNext && handleMonthChange(addMonths(selectedMonth, 1))} className={`p-1 rounded-md transition-colors ${canGoNext ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'}`} title={canGoNext ? "Next month" : "Cannot go beyond current month"} disabled={!canGoNext}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          <button onClick={() => handleViewModeChange('annual')} className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${viewMode === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            Annual
          </button>
          <button onClick={() => handleViewModeChange('monthly')} className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            Monthly
          </button>
          <button onClick={() => handleViewModeChange('custom')} className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${viewMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            Custom
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 11, fill: chartColors.text }}
              stroke={chartColors.text}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: chartColors.text }}
              stroke={chartColors.text}
              label={{ value: 'Minutes / Miles', angle: -90, position: 'insideLeft', style: { fill: chartColors.text } }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 11, fill: chartColors.text }}
              stroke={chartColors.text}
              label={{ value: 'Weight (lbs)', angle: 90, position: 'insideRight', style: { fill: chartColors.text } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: chartColors.tooltip.bg,
                border: `1px solid ${chartColors.tooltip.border}`,
                borderRadius: '0.375rem'
              }}
              labelStyle={{ color: chartColors.text }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => <span style={{ color: chartColors.text }}>{value}</span>}
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