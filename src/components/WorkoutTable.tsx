'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { WorkoutSession } from './WorkoutDashboard'
import { Edit2, Trash2, Bike } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface WorkoutTableProps {
  sessions: WorkoutSession[]
  onEdit?: (session: WorkoutSession) => void
  onDelete?: (id: string) => void
}

type SortField = 'date' | 'source' | 'activity' | 'minutes' | 'miles' | 'weightLifted'
type SortDirection = 'asc' | 'desc'

export function WorkoutTable({ sessions, onEdit, onDelete }: WorkoutTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedSessions = useMemo(() => {
    return sessions.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'date':
          aValue = a.date.getTime()
          bValue = b.date.getTime()
          break
        case 'source':
          aValue = a.source.toLowerCase()
          bValue = b.source.toLowerCase()
          break
        case 'activity':
          aValue = a.activity.toLowerCase()
          bValue = b.activity.toLowerCase()
          break
        case 'minutes':
          aValue = a.minutes
          bValue = b.minutes
          break
        case 'miles':
          aValue = a.miles || 0
          bValue = b.miles || 0
          break
        case 'weightLifted':
          aValue = a.weightLifted || 0
          bValue = b.weightLifted || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [sessions, sortField, sortDirection])

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No workout sessions yet. Add your first session above!
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
            <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Source</th>
            <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Activity</th>
            <th className="text-right py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Minutes</th>
            <th className="text-right py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Miles</th>
            <th className="text-right py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Weight</th>
            <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedSessions.map((session) => (
            <tr key={session.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                {format(new Date(session.date), 'MMM d, yyyy')}
              </td>
              <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {session.source}
              </td>
              <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {session.activity}
              </td>
              <td className="py-2 sm:py-3 px-2 text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {formatNumber(session.minutes)}
              </td>
              <td className="py-2 sm:py-3 px-2 text-right text-xs sm:text-sm">
                <div className="flex items-center justify-end gap-1">
                  {session.source === 'Cannondale' && session.miles ? (
                    <span title="1.5× miles multiplier applied for goal tracking" className="text-green-600 dark:text-green-400">
                      <Bike className="w-3 h-3 inline-block" />
                    </span>
                  ) : null}
                  <span className="text-gray-700 dark:text-gray-300">
                    {session.miles ? formatNumber(session.miles) : '—'}
                  </span>
                </div>
              </td>
              <td className="py-2 sm:py-3 px-2 text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {session.weightLifted ? formatNumber(session.weightLifted) : '—'}
              </td>
              <td className="py-2 sm:py-3 px-2 text-center">
                {onDelete && (
                  <button
                    onClick={() => onDelete(session.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Delete workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}