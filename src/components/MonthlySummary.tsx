'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { format } from 'date-fns'

interface MonthlySummaryProps {
  sessions: WorkoutSession[]
  onMonthSelect?: (month: Date) => void
  selectedMonth?: Date // New prop to track which month is currently being charted
}

interface MonthlyData {
  month: string
  monthDate: Date
  minutes: number
  miles: number
  weight: number
  sessions: number
}

export function MonthlySummary({ sessions, onMonthSelect, selectedMonth }: MonthlySummaryProps) {
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyData>()
    
    sessions.forEach(session => {
      const monthKey = format(session.date, 'yyyy-MM')
      const monthName = format(session.date, 'MMMM')
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          monthDate: session.date,
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
    <div className="space-y-6">
      {/* Recent Months Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 font-semibold text-gray-700">Month</th>
              <th className="text-right py-3 font-semibold text-gray-700">Sessions</th>
              <th className="text-right py-3 font-semibold text-gray-700">Minutes</th>
              <th className="text-right py-3 font-semibold text-gray-700">Miles</th>
              <th className="text-right py-3 font-semibold text-gray-700">Weight</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.slice(0, 6).map((data, index) => {
              // Check if this month matches the selected month for charting
              const isSelectedMonth = selectedMonth && 
                format(data.monthDate, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')
              
              return (
                <tr 
                  key={index} 
                  onClick={() => onMonthSelect?.(data.monthDate)}
                  className={`border-b border-gray-100 transition-colors ${
                    onMonthSelect ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'
                  } ${
                    isSelectedMonth ? 'bg-blue-100 font-medium border-blue-200' : ''
                  }`}
                  title={onMonthSelect ? `Click to view ${data.month} daily chart` : undefined}
                >
                  <td className="py-3 text-gray-900">
                    {data.month}
                    {isSelectedMonth && <span className="ml-2 text-xs text-blue-600 font-medium">CHARTED</span>}
                  </td>
                  <td className="py-3 text-right text-gray-900">{data.sessions}</td>
                  <td className="py-3 text-right text-gray-900">{data.minutes.toLocaleString()}</td>
                  <td className="py-3 text-right text-gray-900">{data.miles.toFixed(0)}</td>
                  <td className="py-3 text-right text-gray-900">{data.weight.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Key Totals - More prominent */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">All-Time Totals</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {monthlyData.reduce((sum, data) => sum + data.sessions, 0)}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Sessions</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {monthlyData.reduce((sum, data) => sum + data.minutes, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">Minutes</div>
          </div>
        </div>
      </div>
    </div>
  )
}