'use client'

import { format } from 'date-fns'
import { WorkoutSession } from './WorkoutDashboard'

interface WorkoutTableProps {
  sessions: WorkoutSession[]
}

export function WorkoutTable({ sessions }: WorkoutTableProps) {
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
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Minutes
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Miles
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Weight Lifted
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sessions.map((session) => (
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
  )
}
