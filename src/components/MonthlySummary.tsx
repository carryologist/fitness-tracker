'use client'

import { WorkoutSession } from './WorkoutDashboard'
import { formatNumber } from '../utils/numberFormat'

interface MonthlySummaryProps {
  sessions: WorkoutSession[]
  selectedMonths: number[]
  onMonthSelect: (month: number) => void
}

export function MonthlySummary({ sessions, selectedMonths, onMonthSelect }: MonthlySummaryProps) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getMonthData = (monthIndex: number) => {
    const monthSessions = sessions.filter(s => {
      const date = new Date(s.date)
      return date.getMonth() === monthIndex && date.getFullYear() === new Date().getFullYear()
    })

    return {
      sessions: monthSessions.length,
      minutes: monthSessions.reduce((sum, s) => sum + s.minutes, 0),
      miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
      weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Monthly Summary</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Recent performance</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Month</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Sessions</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Minutes</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Miles</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Weight</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, index) => {
              const monthData = getMonthData(index)
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
                  onClick={() => onMonthSelect(index)}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        isSelected 
                          ? 'text-primary-600 dark:text-primary-400' 
                          : hasData 
                            ? 'text-gray-900 dark:text-gray-100' 
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {month}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded">
                          SELECTED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`text-right py-3 px-2 ${
                    hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatNumber(monthData.sessions)}
                  </td>
                  <td className={`text-right py-3 px-2 ${
                    hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatNumber(monthData.minutes)}
                  </td>
                  <td className={`text-right py-3 px-2 ${
                    hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatNumber(monthData.miles)}
                  </td>
                  <td className={`text-right py-3 px-2 ${
                    hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatNumber(monthData.weight)}
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