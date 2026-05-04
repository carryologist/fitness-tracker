'use client'

import React from 'react'
import { Plus, Calendar, Settings, RefreshCw, Upload } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { AuthHeader } from './AuthHeader'

interface DashboardHeaderProps {
  currentYear: number
  setCurrentYear: (year: number) => void
  syncing: 'peloton' | 'tonal' | null
  importing: boolean
  importProgress: string | null
  onSync: (service: 'peloton' | 'tonal') => void
  onImportClick: () => void
  onSettingsClick: () => void
  onAddWorkoutClick: () => void
}

export function DashboardHeader({
  currentYear,
  setCurrentYear,
  syncing,
  importing,
  importProgress,
  onSync,
  onImportClick,
  onSettingsClick,
  onAddWorkoutClick,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Layout - Stack vertically */}
        <div className="sm:hidden py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fitness-logo.svg"
                alt="Fitness Tracker"
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Fitness Tracker
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSync('peloton')}
                disabled={syncing !== null}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing === 'peloton' ? 'animate-spin' : ''}`} />
                <span>{syncing === 'peloton' ? 'Syncing…' : 'Peloton'}</span>
              </button>
              <button
                onClick={() => onSync('tonal')}
                disabled={syncing !== null}
                className="bg-gray-900 dark:bg-gray-200 hover:bg-black dark:hover:bg-white disabled:opacity-50 text-white dark:text-gray-900 px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing === 'tonal' ? 'animate-spin' : ''}`} />
                <span>{syncing === 'tonal' ? 'Syncing…' : 'Tonal'}</span>
              </button>
              {/* OCR screenshot import — fallback when API sync doesn't capture a workout */}
              <button
                onClick={onImportClick}
                disabled={importing}
                className="bg-gray-700 dark:bg-gray-500 hover:bg-gray-800 dark:hover:bg-gray-400 disabled:opacity-50 text-white dark:text-gray-900 p-1.5 rounded-lg transition-colors shadow-sm"
                title="Import Tonal screenshot (fallback)"
                aria-label="Import Tonal screenshot"
              >
                <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-pulse' : ''}`} />
                {importing && importProgress && <span className="text-[10px]">{importProgress}</span>}
              </button>
              <button
                onClick={onSettingsClick}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrentYear(2025)}
                className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currentYear === 2025
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>2025</span>
              </button>
              <button
                onClick={() => setCurrentYear(2026)}
                className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currentYear === 2026
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>2026</span>
              </button>
            </div>
            <button
              onClick={onAddWorkoutClick}
              className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Desktop Layout - Horizontal */}
        <div className="hidden sm:flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fitness-logo.svg"
              alt="Fitness Tracker"
              className="w-10 h-10 rounded-lg shadow-sm"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                Fitness Tracker
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Track your progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrentYear(2025)}
                className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currentYear === 2025
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>2025</span>
              </button>
              <button
                onClick={() => setCurrentYear(2026)}
                className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currentYear === 2026
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>2026</span>
              </button>
            </div>
            <button
              onClick={() => onSync('peloton')}
              disabled={syncing !== null}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${syncing === 'peloton' ? 'animate-spin' : ''}`} />
              <span>{syncing === 'peloton' ? 'Syncing…' : 'Sync Peloton'}</span>
            </button>
            <button
              onClick={() => onSync('tonal')}
              disabled={syncing !== null}
              className="bg-gray-900 dark:bg-gray-200 hover:bg-black dark:hover:bg-white disabled:opacity-50 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${syncing === 'tonal' ? 'animate-spin' : ''}`} />
              <span>{syncing === 'tonal' ? 'Syncing…' : 'Sync Tonal'}</span>
            </button>
            {/* OCR screenshot import — fallback when API sync doesn't capture a workout */}
            <button
              onClick={onImportClick}
              disabled={importing}
              className="bg-gray-700 dark:bg-gray-500 hover:bg-gray-800 dark:hover:bg-gray-400 disabled:opacity-50 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
              title="Import Tonal screenshot (fallback)"
            >
              <Upload className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
              <span>{importing ? `Importing ${importProgress || ''}…` : 'Import Tonal'}</span>
            </button>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
            <ThemeToggle />
            <AuthHeader />
            <button
              onClick={onAddWorkoutClick}
              className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
