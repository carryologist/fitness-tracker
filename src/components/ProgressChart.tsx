'use client'

import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { WorkoutSession } from './WorkoutDashboard'
import { format, startOfMonth, eachMonthOfInterval, min, max, startOfDay, eachDayOfInterval, endOfMonth, getMonth, getYear, addMonths, subMonths } from 'date-fns'
import { Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProgressChartProps {
  sessions: WorkoutSession[]
  initialViewMode?: 'annual' | 'monthly'
  initialSelectedMonth?: Date
  onMonthChange?: (month: Date) => void
}

export function ProgressChart({ 
  sessions, 
  initialViewMode = 'annual',
  initialSelectedMonth = new Date(),
  onMonthChange
}: ProgressChartProps) {
  const [viewMode, setViewMode] = useState<'annual' | 'monthly'>(initialViewMode)
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth)
  
  // Update selected month when prop changes
  React.useEffect(() => {
    setSelectedMonth(initialSelectedMonth)
    if (initialViewMode === 'monthly') {
      setViewMode('monthly')
    }
  }, [initialSelectedMonth, initialViewMode])
  
  // Notify parent when month changes
  const handleMonthChange = (newMonth: Date) => {
    setSelectedMonth(newMonth)
    onMonthChange?.(newMonth)
  }
  
  // Helper functions for month navigation limits
  const currentMonth = new Date()
  const isCurrentOrFutureMonth = selectedMonth >= startOfMonth(currentMonth)
  const canGoNext = !isCurrentOrFutureMonth

  const chartData = useMemo(() => {
    if (sessions.length === 0) return []
    
    if (viewMode === 'annual') {
      // Annual view: aggregate by month
      const dates = sessions.map(s => s.date)
      const minDate = min(dates)
      const maxDate = max(dates)
      
      const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: startOfMonth(maxDate) })
      
      return months.map(month => {
        const monthKey = format(month, 'yyyy-MM')
        const monthSessions = sessions.filter(session => 
          format(session.date, 'yyyy-MM') === monthKey
        )
        
        return {
          period: format(month, 'MMM yyyy'),
          minutes: monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    } else {
      // Monthly view: aggregate by day for selected month
      const monthStart = startOfMonth(selectedMonth)
      const monthEnd = endOfMonth(selectedMonth)
      
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
      
      return days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const daySessions = sessions.filter(session => 
          format(session.date, 'yyyy-MM-dd') === dayKey
        )
        
        return {
          period: format(day, 'd'),
          minutes: daySessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
          miles: daySessions.reduce((sum, s) => sum + (s.miles || 0), 0),
          weight: daySessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
        }
      })
    }
  }, [sessions, viewMode, selectedMonth])

  // Calculate dynamic domains with extra headroom
  const domains = useMemo(() => {
    if (chartData.length === 0) return { left: [0, 50], right: [0, 1000] }
    
    // Extract values for left axis (minutes and miles)
    const minutesValues = chartData.map(d => d.minutes).filter(v => v > 0)
    const milesValues = chartData.map(d => d.miles).filter(v => v > 0)
    const leftValues = [...minutesValues, ...milesValues]
    
    // Extract values for right axis (weight)
    const weightValues = chartData.map(d => d.weight).filter(v => v > 0)
    
    // Calculate left domain (minutes/miles)
    let leftMax = 50 // default
    if (leftValues.length > 0) {
      const dataMax = Math.max(...leftValues)
      // Add 30% headroom above data + ensure we have at least 2 extra tick marks
      leftMax = Math.ceil(dataMax * 1.3)
      // Round up to next nice number
      if (leftMax <= 10) leftMax = Math.ceil(leftMax / 2) * 2
      else if (leftMax <= 50) leftMax = Math.ceil(leftMax / 5) * 5
      else leftMax = Math.ceil(leftMax / 10) * 10
    }
    
    // Calculate right domain (weight)
    let rightMax = 1000 // default
    if (weightValues.length > 0) {
      const dataMax = Math.max(...weightValues)
      // Add 30% headroom above data
      rightMax = Math.ceil(dataMax * 1.3)
      // Round up to next nice number
      if (rightMax <= 1000) rightMax = Math.ceil(rightMax / 100) * 100
      else if (rightMax <= 10000) rightMax = Math.ceil(rightMax / 1000) * 1000
      else rightMax = Math.ceil(rightMax / 10000) * 10000
    }
    
    return {
      left: [0, leftMax],
      right: [0, rightMax]
    }
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data to display. Add some workout sessions to see your progress!
      </div>
    )
  }

  return (
    <div className="h-96">
      {/* Chart Header with Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'annual' ? 'Annual Progress by Month' : `${format(selectedMonth, 'MMMM yyyy')} Daily Progress`}
            </h3>
            <p className="text-sm text-gray-600">
              {viewMode === 'annual' ? 'Your fitness journey over the year' : 'Daily activity for the month'}
            </p>
          </div>
          
          {/* Month Navigation - only show in monthly view */}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(subMonths(selectedMonth, 1))}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => canGoNext && handleMonthChange(addMonths(selectedMonth, 1))}
                className={`p-1 rounded-md transition-colors ${
                  canGoNext 
                    ? 'hover:bg-gray-100 text-gray-600' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={canGoNext ? "Next month" : "Cannot go beyond current month"}
                disabled={!canGoNext}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('annual')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'annual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Annual
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Monthly
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            angle={viewMode === 'monthly' ? 0 : -45}
            textAnchor={viewMode === 'monthly' ? 'middle' : 'end'}
            height={viewMode === 'monthly' ? 40 : 80}
            interval={viewMode === 'monthly' ? 2 : 0}
          />
          {/* Left Y-axis for Minutes and Miles */}
          <YAxis 
            yAxisId="left"
            domain={domains.left}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString()}
            label={{ 
              value: 'Minutes / Miles', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' },
              offset: -10
            }}
            width={60}
          />
          {/* Right Y-axis for Weight */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            domain={domains.right}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString()}
            label={{ 
              value: 'Weight (lbs)', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle' },
              offset: -10
            }}
            width={80}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'minutes') return [value.toLocaleString(), 'Minutes']
              if (name === 'miles') return [value.toFixed(1), 'Miles']
              if (name === 'weight') return [value.toLocaleString(), 'Weight Lifted (lbs)']
              return [value, name]
            }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="minutes" 
            stroke="#3B82F6" 
            strokeWidth={3}
            name="Minutes"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="miles" 
            stroke="#10B981" 
            strokeWidth={3}
            name="Miles"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="weight" 
            stroke="#F59E0B" 
            strokeWidth={3}
            name="Weight Lifted (lbs)"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}