'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { WorkoutSession } from './WorkoutDashboard'
import { ChevronUp, ChevronDown, Filter } from 'lucide-react'

interface WorkoutTableProps {
  sessions: WorkoutSession[]
}

type SortField = 'date' | 'source' | 'activity' | 'minutes' | 'miles' | 'weightLifted'
type SortDirection = 'asc' | 'desc'

export function WorkoutTable({ sessions }: WorkoutTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filters, setFilters] = useState({
    source: '',
    activity: '',
    minMinutes: '',
    maxMinutes: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedSessions = useMemo(() => {
    const filtered = sessions.filter(session => {
      const matchesSource = !filters.source || session.source.toLowerCase().includes(filters.source.toLowerCase())
      const matchesActivity = !filters.activity || session.activity.toLowerCase().includes(filters.activity.toLowerCase())
      const matchesMinMinutes = !filters.minMinutes || session.minutes >= parseInt(filters.minMinutes)
      const matchesMaxMinutes = !filters.maxMinutes || session.minutes <= parseInt(filters.maxMinutes)
      
      return matchesSource && matchesActivity && matchesMinMinutes && matchesMaxMinutes
    })

    return filtered.sort((a, b) => {
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
  }, [sessions, sortField, sortDirection, filters])

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3" /> : 
            <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  )

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No workout sessions yet. Add your first session above!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedSessions.length} of {sessions.length} sessions
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                placeholder="Filter by source..."
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Activity</label>
              <input
                type="text"
                placeholder="Filter by activity..."
                value={filters.activity}
                onChange={(e) => setFilters(prev => ({ ...prev, activity: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Minutes</label>
              <input
                type="number"
                placeholder="Min..."
                value={filters.minMinutes}
                onChange={(e) => setFilters(prev => ({ ...prev, minMinutes: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Minutes</label>
              <input
                type="number"
                placeholder="Max..."
                value={filters.maxMinutes}
                onChange={(e) => setFilters(prev => ({ ...prev, maxMinutes: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader field="date">Date</SortableHeader>
              <SortableHeader field="source">Source</SortableHeader>
              <SortableHeader field="activity">Activity</SortableHeader>
              <SortableHeader field="minutes">Minutes</SortableHeader>
              <SortableHeader field="miles">Miles</SortableHeader>
              <SortableHeader field="weightLifted">Weight Lifted</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedSessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(session.date, 'M/d/yy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.source}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.activity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.minutes}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.miles ? session.miles.toFixed(1) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.weightLifted ? session.weightLifted.toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {session.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}