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

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data to display. Add some workout sessions to see your progress!
      </div>
    )
  }

  return (
    <div className="h-64">
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
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'minutes') return [value.toLocaleString(), 'Minutes']
              if (name === 'miles') return [value.toFixed(1), 'Miles']
              if (name === 'weight') return [value.toLocaleString(), 'Weight Lifted']
              return [value, name]
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="minutes" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Minutes"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="miles" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Miles"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke="#F59E0B" 
            strokeWidth={2}
            name="Weight Lifted"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
