'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { WorkoutSession } from './WorkoutDashboard'
import { format, startOfMonth, eachMonthOfInterval, min, max } from 'date-fns'

interface ProgressChartProps {
  sessions: WorkoutSession[]
}

export function ProgressChart({ sessions }: ProgressChartProps) {
  const chartData = useMemo(() => {
    if (sessions.length === 0) return []
    
    // Get date range
    const dates = sessions.map(s => s.date)
    const minDate = min(dates)
    const maxDate = max(dates)
    
    // Generate all months in range
    const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: startOfMonth(maxDate) })
    
    // Aggregate data by month
    const monthlyData = months.map(month => {
      const monthKey = format(month, 'yyyy-MM')
      const monthSessions = sessions.filter(session => 
        format(session.date, 'yyyy-MM') === monthKey
      )
      
      return {
        month: format(month, 'MMM yyyy'),
        minutes: monthSessions.reduce((sum, s) => sum + s.minutes, 0),
        miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
        weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
      }
    })
    
    return monthlyData
  }, [sessions])

  // Calculate domains for better scaling
  const domains = useMemo(() => {
    if (chartData.length === 0) return { left: [0, 100], right: [0, 10] }
    
    const minutes = chartData.map(d => d.minutes)
    const miles = chartData.map(d => d.miles)
    const weights = chartData.map(d => d.weight)
    
    // Left axis: minutes and weight
    const leftValues = [...minutes, ...weights].filter(v => v > 0)
    const leftMin = leftValues.length > 0 ? Math.min(...leftValues) : 0
    const leftMax = leftValues.length > 0 ? Math.max(...leftValues) : 100
    const leftPadding = (leftMax - leftMin) * 0.1
    
    // Right axis: miles
    const milesValues = miles.filter(v => v > 0)
    const milesMin = milesValues.length > 0 ? Math.min(...milesValues) : 0
    const milesMax = milesValues.length > 0 ? Math.max(...milesValues) : 10
    const milesPadding = (milesMax - milesMin) * 0.1
    
    return {
      left: [Math.max(0, leftMin - leftPadding), leftMax + leftPadding],
      right: [Math.max(0, milesMin - milesPadding), milesMax + milesPadding]
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
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          {/* Left Y-axis for Minutes and Weight */}
          <YAxis 
            yAxisId="left"
            domain={domains.left}
            tick={{ fontSize: 12 }}
            label={{ value: 'Minutes / Weight (lbs)', angle: -90, position: 'insideLeft' }}
          />
          {/* Right Y-axis for Miles */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            domain={domains.right}
            tick={{ fontSize: 12 }}
            label={{ value: 'Miles', angle: 90, position: 'insideRight' }}
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
            yAxisId="right"
            type="monotone" 
            dataKey="miles" 
            stroke="#10B981" 
            strokeWidth={3}
            name="Miles"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
          />
          <Line 
            yAxisId="left"
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