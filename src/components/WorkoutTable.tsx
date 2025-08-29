'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { WorkoutSession } from './WorkoutDashboard'
import { Edit2, Trash2 } from 'lucide-react'
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
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {sessions.length} of {sessions.length} sessions
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Date
            </th>
            <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Source
            </th>
            <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Activity
            </th>
            <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Minutes
            </th>
            <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Miles
            </th>
            <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Weight Lifted
            </th>
            <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Notes
            </th>
            <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedSessions.map((session) => (
            <tr 
              key={session.id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-3 px-2 text-sm text-gray-900 dark:text-gray-100">
                {format(session.date, 'M/d/yy')}
              </td>
              <td className="py-3 px-2 text-sm text-gray-900 dark:text-gray-100">
                {session.source}
              </td>
              <td className="py-3 px-2 text-sm text-gray-900 dark:text-gray-100">
                {session.activity}
              </td>
              <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">
                {session.minutes}
              </td>
              <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">
                {session.miles ? session.miles.toFixed(1) : '-'}
              </td>
              <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">
                {session.weightLifted ? formatNumber(session.weightLifted) : '-'}
              </td>
              <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                {session.notes || '-'}
              </td>
              <td className="py-3 px-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(session)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Edit workout"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(session.id)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No workout sessions recorded yet.
        </div>
      )}
    </div>
  )
}