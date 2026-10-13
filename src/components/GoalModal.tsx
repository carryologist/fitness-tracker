'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Goal } from '@/types/workout'
import { X } from 'lucide-react'
import { goalInput } from '@/lib/goal-input'
import { workoutDay } from '@/lib/calendar'
import { createGoal } from '../utils/goalCalculations'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>
  defaultYear?: number
  existingGoal?: Goal
}

export function GoalModal({ isOpen, onClose, onSubmit, existingGoal, defaultYear }: GoalModalProps) {
  const [formData, setFormData] = useState({
    name: existingGoal?.name || '',
    year: (existingGoal?.year || defaultYear || Number(workoutDay(new Date()).slice(0, 4))) as number | '',
    annualWeightTarget: existingGoal?.annualWeightTarget || 1000000,
    minutesPerSession: (existingGoal?.minutesPerSession || 45) as number | '',
    weeklySessionsTarget: (existingGoal?.weeklySessionsTarget || 5) as number | ''
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setFormData({ name: existingGoal?.name ?? '',
      year: existingGoal?.year ?? defaultYear ?? Number(workoutDay(new Date()).slice(0, 4)),
      annualWeightTarget: existingGoal?.annualWeightTarget ?? 1000000,
      minutesPerSession: existingGoal?.minutesPerSession ?? 45,
      weeklySessionsTarget: existingGoal?.weeklySessionsTarget ?? 5 })
    setSaveError(null)
  }, [isOpen, existingGoal, defaultYear])

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
    if (e.key === 'Escape' && !saving) {
      onClose()
    }
  }, [onClose, saving])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const parsed = goalInput.safeParse(formData)
    if (!parsed.success) { setSaveError('Enter a name and valid goal targets.'); return }
    const goal = createGoal(
      parsed.data.name,
      parsed.data.year,
      parsed.data.annualWeightTarget,
      parsed.data.minutesPerSession,
      parsed.data.weeklySessionsTarget
    )
    
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSubmit(goal)
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save goal. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  // Calculate derived values for display
  const weeklyMinutes = Number(formData.minutesPerSession) * Number(formData.weeklySessionsTarget)
  const annualMinutes = weeklyMinutes * 52
  const quarterlyWeight = formData.annualWeightTarget / 4
  const quarterlyMinutes = annualMinutes / 4
  const quarterlySessions = Number(formData.weeklySessionsTarget) * 13

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
          <button disabled={saving} onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close goal modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
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
              placeholder="e.g., Annual Fitness Challenge"
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
              onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="2020"
              max="2100"
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
              onChange={(e) => setFormData(prev => ({ ...prev, minutesPerSession: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="480"
              step="1"
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
              onChange={(e) => setFormData(prev => ({ ...prev, weeklySessionsTarget: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="30"
              step="1"
              placeholder="5"
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Calculated Targets:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Weekly Minutes: {weeklyMinutes.toLocaleString()}</div>
              <div>Annual Minutes: {annualMinutes.toLocaleString()}</div>
              <div>Quarterly Weight: {quarterlyWeight.toLocaleString()} lbs</div>
              <div>Quarterly Minutes: {quarterlyMinutes.toLocaleString()}</div>
              <div>Quarterly Sessions: {quarterlySessions}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {saving ? 'Saving…' : existingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
