'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Goal } from '@/types/workout'
import { X } from 'lucide-react'
import { createGoal } from '../utils/goalCalculations'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void
  existingGoal?: Goal
}

export function GoalModal({ isOpen, onClose, onSubmit, existingGoal }: GoalModalProps) {
  const [formData, setFormData] = useState({
    name: existingGoal?.name || '',
    year: existingGoal?.year || new Date().getFullYear(),
    annualWeightTarget: existingGoal?.annualWeightTarget || 1000000,
    minutesPerSession: existingGoal?.minutesPerSession || 45,
    weeklySessionsTarget: existingGoal?.weeklySessionsTarget || 5
  })

  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap: focus the panel on open, wrap Tab at boundaries
  useEffect(() => {
    if (!isOpen || !panelRef.current) return

    panelRef.current.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleEscapeKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const goal = createGoal(
      formData.name,
      formData.year,
      formData.annualWeightTarget,
      formData.minutesPerSession,
      formData.weeklySessionsTarget
    )
    
    onSubmit(goal)
    onClose()
  }

  // Calculate derived values for display
  const weeklyMinutes = formData.minutesPerSession * formData.weeklySessionsTarget
  const annualMinutes = weeklyMinutes * 52
  const quarterlyWeight = formData.annualWeightTarget / 4
  const quarterlyMinutes = annualMinutes / 4
  const quarterlySessions = formData.weeklySessionsTarget * 13

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      onKeyDown={handleEscapeKey}
      tabIndex={-1}
    >
      <div ref={panelRef} className="bg-white rounded-lg p-6 w-full max-w-md mx-4" tabIndex={-1}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="goal-modal-title" className="text-xl font-bold text-gray-900">
            {existingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close goal modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="goal-name" className="block text-sm font-medium text-gray-700 mb-1">
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2026 Fitness Challenge"
              required
            />
          </div>

          <div>
            <label htmlFor="goal-year" className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              id="goal-year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="2024"
              max="2030"
              required
            />
          </div>

          <div>
            <label htmlFor="goal-weight-target" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Weight Target (lbs)
            </label>
            <input
              id="goal-weight-target"
              type="text"
              value={formData.annualWeightTarget.toLocaleString()}
              onChange={(e) => {
                const numericValue = parseInt(e.target.value.replace(/,/g, '')) || 0
                setFormData(prev => ({ ...prev, annualWeightTarget: numericValue }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="500,000"
              required
            />
          </div>

          <div>
            <label htmlFor="goal-minutes-per-session" className="block text-sm font-medium text-gray-700 mb-1">
              Minutes per Session
            </label>
            <input
              id="goal-minutes-per-session"
              type="number"
              value={formData.minutesPerSession}
              onChange={(e) => setFormData(prev => ({ ...prev, minutesPerSession: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="45"
              required
            />
          </div>

          <div>
            <label htmlFor="goal-sessions-per-week" className="block text-sm font-medium text-gray-700 mb-1">
              Sessions per Week
            </label>
            <input
              id="goal-sessions-per-week"
              type="number"
              value={formData.weeklySessionsTarget}
              onChange={(e) => setFormData(prev => ({ ...prev, weeklySessionsTarget: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5"
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Calculated Targets:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              {formData.year === 2026 ? (
                <>
                  <div>Weekly Pattern: 3 days × 45 mins, 2 days × 60 mins</div>
                  <div>Weekly Minutes: 255</div>
                  <div>Annual Minutes: {(255 * 52).toLocaleString()}</div>
                </>
              ) : (
                <>
                  <div>Weekly Minutes: {weeklyMinutes.toLocaleString()}</div>
                  <div>Annual Minutes: {annualMinutes.toLocaleString()}</div>
                </>
              )}
              <div>Quarterly Weight: {quarterlyWeight.toLocaleString()} lbs</div>
              <div>Quarterly Minutes: {quarterlyMinutes.toLocaleString()}</div>
              <div>Quarterly Sessions: {quarterlySessions}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {existingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
