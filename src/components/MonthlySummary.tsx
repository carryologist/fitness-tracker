'use client'

import React, { useState, useEffect } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { formatNumber } from '../utils/numberFormat'

interface MonthlySummaryProps {
  sessions: WorkoutSession[]
  selectedMonths?: number[]
  onMonthToggle?: (month: number) => void
}

export function MonthlySummary({ sessions, selectedMonths = [], onMonthToggle }: MonthlySummaryProps) {
  // Use state for current year to avoid hydration mismatch
  const [currentYear, setCurrentYear] = useState(2025) // Default to 2025
  
  useEffect(() => {
    // Only update on client side
    setCurrentYear(new Date().getFullYear())
  }, [])
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const monthlyStats = months.map((month, index) => {
    const monthSessions = sessions.filter(session => {
      const date = new Date(session.date)
      return date.getMonth() === index && date.getFullYear() === currentYear
    })

    return {
      sessions: monthSessions.length,
      minutes: monthSessions.reduce((sum, s) => sum + s.minutes, 0),
      miles: monthSessions.reduce((sum, s) => sum + (s.adjustedMiles || s.miles || 0), 0),
      weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
    }
  })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Monthly Summary</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Recent performance</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Month</th>
              <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Sessions</th>
              <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Minutes</th>
              <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Miles</th>
              <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Weight</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, index) => {
              const monthData = monthlyStats[index]
              const isSelected = selectedMonths.includes(index)
              const hasData = monthData.sessions > 0
              
              return (
                <tr 
                  key={month}
                  className={`
                    border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-primary-50 dark:bg-primary-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }
                  `}
                  onClick={() => onMonthToggle?.(index)}
                >
                  <td className="py-2 sm:py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-xs sm:text-sm ${
                        hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {month}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">SELECTED</span>
                      )}
                    </div>
                  </td>
                  <td className={`text-right py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm ${
                    hasData ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {monthData.sessions}
                  </td>
                  <td className={`text-right py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm ${
                    hasData ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {formatNumber(monthData.minutes)}
                  </td>
                  <td className={`text-right py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm ${
                    hasData ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {formatNumber(monthData.miles)}
                  </td>
                  <td className={`text-right py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm ${
                    hasData ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {monthData.weight > 0 ? formatNumber(monthData.weight) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}