'use client'

import { creditedMiles, creditedMinutes } from '@/utils/workoutTotals'
import { workoutCalendarDate } from '@/lib/calendar'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { WorkoutSession } from '@/types/workout'
import { Trash2, Bike, Calculator } from 'lucide-react'
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
  const sortBy = (field: SortField) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc')
    setSortField(field)
  }
  const [activityFilter, setActivityFilter] = useState<string | null>(null)

  // Derive unique activity types with counts, sorted by frequency
  const activityOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of sessions) {
      counts[s.activity] = (counts[s.activity] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([activity, count]) => ({ activity, count }))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    if (!activityFilter) return sessions
    return sessions.filter(s => s.activity === activityFilter)
  }, [sessions, activityFilter])

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
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
          aValue = creditedMinutes(a)
          bValue = creditedMinutes(b)
          break
        case 'miles':
          aValue = creditedMiles(a)
          bValue = creditedMiles(b)
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
  }, [filteredSessions, sortField, sortDirection])

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No workout sessions yet. Add your first session above!
      </div>
    )
  }

  return (
    <div>
      {/* Activity filter pills */}
      {activityOptions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="Filter by activity type">
          <button
            role="radio"
            aria-checked={activityFilter === null}
            onClick={() => setActivityFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activityFilter === null
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({sessions.length})
          </button>
          {activityOptions.map(({ activity, count }) => (
            <button
              key={activity}
              role="radio"
              aria-checked={activityFilter === activity}
              onClick={() => setActivityFilter(activityFilter === activity ? null : activity)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activityFilter === activity
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {activity} ({count})
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {([
                { field: 'date', label: 'Date', numeric: false },
                { field: 'source', label: 'Source', numeric: false },
                { field: 'activity', label: 'Activity', numeric: false },
                { field: 'minutes', label: 'Minutes', numeric: true },
                { field: 'miles', label: 'Miles', numeric: true },
                { field: 'weightLifted', label: 'Weight', numeric: true },
              ] as const).map(column => (
                <th key={column.field}
                  className={`${column.numeric ? 'text-right' : 'text-left'} py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300`}
                  aria-sort={sortField === column.field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" aria-label={`Sort by ${column.label.toLowerCase()}`} onClick={() => sortBy(column.field)}>
                    {column.label}<span aria-hidden="true">{sortField === column.field ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              ))}
              <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessions.map((session) => (
              <tr key={session.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  <span className="sm:hidden">{format(workoutCalendarDate(session.date), 'M/d/yy')}</span>
                  <span className="hidden sm:inline">{format(workoutCalendarDate(session.date), 'MMM d, yyyy')}</span>
                </td>
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {session.source}
                </td>
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {session.activity}
                </td>
                <td className="py-2 sm:py-3 px-2 text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-1">
                    {session.source === 'Cannondale' && session.adjustedMinutes && session.adjustedMinutes !== session.minutes ? (
                      <>
                        <span title={`Outdoor bonus applied (${session.minutes} × multiplier)`} className="text-green-600 dark:text-green-400">
                          <Bike className="w-3 h-3 inline-block" />
                        </span>
                        <span>{formatNumber(session.adjustedMinutes)}</span>
                      </>
                    ) : (
                      <span>{formatNumber(session.minutes)}</span>
                    )}
                  </div>
                </td>
                <td className="py-2 sm:py-3 px-2 text-right text-xs sm:text-sm">
                  <div className="flex items-center justify-end gap-1">
                    {session.source === 'Cannondale' && session.adjustedMiles && session.adjustedMiles !== session.miles ? (
                      <>
                        <span title={`Outdoor bonus applied (${session.miles} × multiplier)`} className="text-green-600 dark:text-green-400">
                          <Bike className="w-3 h-3 inline-block" />
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">{formatNumber(session.adjustedMiles)}</span>
                      </>
                    ) : session.estimatedMiles ? (
                      <>
                        <span title="Estimated from default cycling speed" className="text-amber-500 dark:text-amber-400">
                          <Calculator className="w-3 h-3 inline-block" />
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 italic">{session.miles ? formatNumber(session.miles) : '—'}</span>
                      </>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">
                        {session.miles ? formatNumber(session.miles) : '—'}
                      </span>
                    )}
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
                      aria-label="Delete workout"
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
    </div>
  )
}
