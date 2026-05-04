'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-focus the dialog when it opens
  useEffect(() => {
    if (isOpen && backdropRef.current) {
      backdropRef.current.focus()
    }
  }, [isOpen])

  // Focus trap: keep Tab/Shift+Tab within the modal
  useEffect(() => {
    if (!isOpen) return

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleFocusTrap)
    return () => document.removeEventListener('keydown', handleFocusTrap)
  }, [isOpen])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div ref={panelRef} className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Default Cycling Speed */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Cycling Speed</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Used to estimate mileage when not recorded by the source.
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label="Default Cycling Speed">
            {[17, 18, 19].map((speed) => (
              <button
                key={speed}
                role="radio"
                aria-checked={settings.defaultCyclingSpeed === speed}
                onClick={() => updateSettings({ defaultCyclingSpeed: speed })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  settings.defaultCyclingSpeed === speed
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {speed} mph
              </button>
            ))}
          </div>
        </div>

        {/* Outdoor Bonus */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Outdoor Bonus</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Cannondale outdoor rides get bonus credit for minutes and miles.
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label="Outdoor Bonus">
            {[1, 1.25, 1.5, 1.75, 2].map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={settings.outdoorMultiplier === m}
                onClick={() => updateSettings({ outdoorMultiplier: m })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  settings.outdoorMultiplier === m
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {m}x
              </button>
            ))}
          </div>
        </div>

        {/* Units */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Units</h3>
          <div className="flex gap-2" role="radiogroup" aria-label="Units">
            <button
              role="radio"
              aria-checked={settings.units === 'imperial'}
              onClick={() => updateSettings({ units: 'imperial' })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors ${
                settings.units === 'imperial'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              🇺🇸 Imperial (mi, lbs)
            </button>
            <button
              role="radio"
              aria-checked={settings.units === 'metric'}
              onClick={() => updateSettings({ units: 'metric' })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors ${
                settings.units === 'metric'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              🌍 Metric (km, kg)
            </button>
          </div>
        </div>

        {/* Workout Defaults */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Source</h3>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Default Source">
            {['Peloton', 'Tonal', 'Cannondale', 'Other'].map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={settings.defaultSource === s}
                onClick={() => updateSettings({ defaultSource: s })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  settings.defaultSource === s
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Activity</h3>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Default Activity">
            {['Cycling', 'Weight Lifting', 'Running', 'Walking', 'Yoga', 'Other'].map((a) => (
              <button
                key={a}
                role="radio"
                aria-checked={settings.defaultActivity === a}
                onClick={() => updateSettings({ defaultActivity: a })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  settings.defaultActivity === a
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
