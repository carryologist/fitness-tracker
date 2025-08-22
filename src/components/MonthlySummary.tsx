'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { format } from 'date-fns'
import { formatNumber } from '../utils/numberFormat'

interface MonthlySummaryProps {
  sessions: WorkoutSession[]
  onToggleMonth?: (month: Date) => void
  selectedMonths?: Date[]
}

interface MonthlyData {
  month: string
  monthDate: Date
  minutes: number
  miles: number
  weight: number
  sessions: number
}

export function MonthlySummary({ sessions, onToggleMonth, selectedMonths = [] }: MonthlySummaryProps) {
  const { yearData } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()

    const monthlyAgg: Record<number, MonthlyData> = {}
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, i, 1)
      monthlyAgg[i] = {
        month: format(d, 'MMMM'),
        monthDate: d,
        minutes: 0,
        miles: 0,
        weight: 0,
        sessions: 0,
      }
    }

    sessions.forEach((session) => {
      if (session.date.getFullYear() !== year) return
      const idx = session.date.getMonth()
      const data = monthlyAgg[idx]
      data.minutes += session.minutes
      data.miles += session.miles || 0
      data.weight += session.weightLifted || 0
      data.sessions += 1
    })

    const yearData = Array.from({ length: 12 }, (_, i) => monthlyAgg[i])

    return { yearData }
  }, [sessions])

  const now = new Date()
  const nowMonthIdx = now.getMonth()

  const isSelected = (d: Date) => selectedMonths.some((m) => format(m, 'yyyy-MM') === format(d, 'yyyy-MM'))

  return (
    <div className="space-y-6 h-full">
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
            {yearData.map((data, index) => {
              const isFuture = index > nowMonthIdx
              const selected = isSelected(data.monthDate)

              const dash = '—'
              const sessionsText = isFuture ? dash : data.sessions
              const minutesText = isFuture ? dash : formatNumber(data.minutes)
              const milesText = isFuture ? dash : formatNumber(data.miles)
              const weightText = isFuture ? dash : formatNumber(data.weight)

              return (
                <tr
                  key={index}
                  onClick={() => !isFuture && onToggleMonth?.(data.monthDate)}
                  className={`border-b border-gray-100 transition-colors ${
                    !isFuture && onToggleMonth ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-70'
                  } ${
                    selected ? 'bg-blue-100 font-medium border-blue-200' : ''
                  }`}
                  title={!isFuture && onToggleMonth ? `Click to toggle ${data.month}` : undefined}
                >
                  <td className="py-3 text-gray-900">
                    {data.month}
                    {selected && <span className="ml-2 text-xs text-blue-600 font-medium">SELECTED</span>}
                  </td>
                  <td className="py-3 text-right text-gray-900">{sessionsText}</td>
                  <td className="py-3 text-right text-gray-900">{minutesText}</td>
                  <td className="py-3 text-right text-gray-900">{milesText}</td>
                  <td className="py-3 text-right text-gray-900">{weightText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}