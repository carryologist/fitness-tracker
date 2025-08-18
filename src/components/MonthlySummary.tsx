'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { format } from 'date-fns'

interface MonthlySummaryProps {
  sessions: WorkoutSession[]
}

interface MonthlyData {
  month: string
  minutes: number
  miles: number
  weight: number
  sessions: number
}

export function MonthlySummary({ sessions }: MonthlySummaryProps) {
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyData>()
    
    sessions.forEach(session => {
      const monthKey = format(session.date, 'yyyy-MM')
      const monthName = format(session.date, 'MMMM')
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          minutes: 0,
          miles: 0,
          weight: 0,
          sessions: 0
        })
      }
      
      const data = monthlyMap.get(monthKey)!
      data.minutes += session.minutes
      data.miles += session.miles || 0
      data.weight += session.weightLifted || 0
      data.sessions += 1
    })
    
    return Array.from(monthlyMap.values()).reverse() // Most recent first
  }, [sessions])

  if (monthlyData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-gray-700">Month</th>
              <th className="text-right py-2 font-medium text-gray-700">Sessions</th>
              <th className="text-right py-2 font-medium text-gray-700">Minutes</th>
              <th className="text-right py-2 font-medium text-gray-700">Miles</th>
              <th className="text-right py-2 font-medium text-gray-700">Weight</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((data, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{data.month}</td>
                <td className="py-2 text-right text-gray-900">{data.sessions}</td>
                <td className="py-2 text-right text-gray-900">{data.minutes.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-900">{data.miles.toFixed(0)}</td>
                <td className="py-2 text-right text-gray-900">{data.weight.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <div className="pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Total Sessions</div>
            <div className="font-semibold text-lg">
              {monthlyData.reduce((sum, data) => sum + data.sessions, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Total Minutes</div>
            <div className="font-semibold text-lg">
              {monthlyData.reduce((sum, data) => sum + data.minutes, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Total Miles</div>
            <div className="font-semibold text-lg">
              {monthlyData.reduce((sum, data) => sum + data.miles, 0).toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Total Weight</div>
            <div className="font-semibold text-lg">
              {monthlyData.reduce((sum, data) => sum + data.weight, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}