'use client'

import { useState } from 'react'
import { Goal } from './WorkoutDashboard'
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
    annualWeightTarget: existingGoal?.annualWeightTarget || 500000,
    weeklyMinutesTarget: existingGoal?.weeklyMinutesTarget || 225, // 45 * 5
    weeklySessionsTarget: existingGoal?.weeklySessionsTarget || 5
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const goal = createGoal(
      formData.name,
      formData.year,
      formData.annualWeightTarget,
      formData.weeklyMinutesTarget,
      formData.weeklySessionsTarget
    )
    
    onSubmit(goal)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {existingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2025 Fitness Challenge"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Weight Target (lbs)
            </label>
            <input
              type="number"
              value={formData.annualWeightTarget}
              onChange={(e) => setFormData(prev => ({ ...prev, annualWeightTarget: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="500000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minutes per Week
            </label>
            <input
              type="number"
              value={formData.weeklyMinutesTarget}
              onChange={(e) => setFormData(prev => ({ ...prev, weeklyMinutesTarget: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="225"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sessions per Week
            </label>
            <input
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
              <div>Annual Minutes: {(formData.weeklyMinutesTarget * 52).toLocaleString()}</div>
              <div>Quarterly Weight: {(formData.annualWeightTarget / 4).toLocaleString()} lbs</div>
              <div>Quarterly Minutes: {((formData.weeklyMinutesTarget * 52) / 4).toLocaleString()}</div>
              <div>Quarterly Sessions: {formData.weeklySessionsTarget * 13}</div>
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
