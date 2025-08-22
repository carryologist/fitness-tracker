'use client'

import { WorkoutForm } from './WorkoutForm'
import { WorkoutSession } from './WorkoutDashboard'
import { X } from 'lucide-react'

interface WorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (session: Omit<WorkoutSession, 'id'>) => void
  initial?: Partial<WorkoutSession>
  submitLabel?: string
}

export function WorkoutModal({ isOpen, onClose, onSubmit, initial, submitLabel }: WorkoutModalProps) {
  const handleSubmit = (session: Omit<WorkoutSession, 'id'>) => {
    onSubmit(session)
    onClose()
  }

  if (!isOpen) return null

  const isEditing = Boolean(initial?.date || initial?.source || initial?.activity)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Session' : 'Add New Session'}</h2>
              <p className="text-gray-600 mt-1">{isEditing ? 'Update your workout' : 'Log your latest workout'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          {/* Form */}
          <div className="p-6">
            <WorkoutForm onSubmit={handleSubmit} initial={initial} submitLabel={submitLabel} />
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}