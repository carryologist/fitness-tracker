'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Units = 'imperial' | 'metric'

export interface Settings {
  defaultSource: string
  defaultActivity: string
  units: Units
  outdoorMultiplier: number
}

const defaultSettings: Settings = {
  defaultSource: 'Peloton',
  defaultActivity: 'Cycling',
  units: 'imperial',
  outdoorMultiplier: 1.5,
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'fitness-tracker-settings'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) })
      }
    } catch {
      // ignore
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  if (!mounted) {
    return (
      <SettingsContext.Provider value={{ settings: defaultSettings, updateSettings }}>
        {children}
      </SettingsContext.Provider>
    )
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
