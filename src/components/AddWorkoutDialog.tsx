'use client'

import React from 'react'
import { X } from 'lucide-react'
import { WorkoutForm } from './WorkoutForm'
import { WorkoutSession } from './WorkoutDashboard'

interface AddWorkoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<WorkoutSession, 'id'>) => void
  editingSession?: WorkoutSession | null
}

export function AddWorkoutDialog({ isOpen, onClose, onSubmit, editingSession }: AddWorkoutDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingSession ? 'Edit Workout' : 'Add Workout'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6">
            <WorkoutForm
              onSubmit={(data) => {
                onSubmit(data)
                onClose()
              }}
              initial={editingSession || undefined}
              submitLabel={editingSession ? 'Save Changes' : 'Add Workout'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}