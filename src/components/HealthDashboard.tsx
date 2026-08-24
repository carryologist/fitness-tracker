'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Scale, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { WeightProgressChart } from './WeightProgressChart'
import { BodyMeasurement, BodyMeasurementApiRecord } from '@/types/health'

function parseMeasurement(raw: BodyMeasurementApiRecord): BodyMeasurement {
  return { ...raw, date: new Date(raw.date) }
}

interface ChangeStatProps {
  label: string
  current: number | null
  previous: number | null
}

function ChangeStat({ label, current, previous }: ChangeStatProps) {
  const delta = current != null && previous != null ? current - previous : null
  const Icon = delta == null || Math.abs(delta) < 0.1 ? Minus : delta > 0 ? TrendingUp : TrendingDown
  const color =
    delta == null || Math.abs(delta) < 0.1
      ? 'text-gray-500 dark:text-gray-400'
      : delta > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-green-600 dark:text-green-400'

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${delta == null ? 'text-gray-900 dark:text-gray-100' : color}`}>
        {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} lbs`}
      </p>
    </div>
  )
}

export function HealthDashboard() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/body-measurements')
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data: BodyMeasurementApiRecord[] = await res.json()
      setMeasurements(data.map(parseMeasurement))
    } catch (error) {
      console.error('Failed to load body measurements:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const statusRes = await fetch('/api/renpho/sync')
      const statusData = await statusRes.json()
      if (!statusData.connected) {
        const authRes = await fetch('/api/renpho/auth', { method: 'POST' })
        if (!authRes.ok) {
          const err = await authRes.json().catch(() => ({ error: 'Auth failed' }))
          setSyncError(`Renpho auth failed: ${err.error || authRes.status}`)
          return
        }
      }
      const res = await fetch('/api/renpho/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.synced > 0 || data.updated > 0) await loadData()
        const parts: string[] = []
        if (data.synced > 0) parts.push(`${data.synced} new`)
        if (data.updated > 0) parts.push(`${data.updated} updated`)
        if (data.skipped > 0) parts.push(`${data.skipped} already synced`)
        setSyncSuccess(`Renpho sync: ${parts.length > 0 ? parts.join(', ') : 'up to date'}`)
        setTimeout(() => setSyncSuccess(null), 6000)
      } else {
        setSyncError(`Renpho sync failed: ${data.error || res.status}`)
      }
    } catch (error) {
      setSyncError(`Renpho sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const sorted = [...measurements].sort((a, b) => b.date.getTime() - a.date.getTime())
  const latest = sorted[0] ?? null
  const findAsOf = (daysAgo: number) => {
    const target = latest ? latest.date.getTime() - daysAgo * 86400000 : 0
    // Closest reading at or before the target date.
    return sorted.find(m => m.date.getTime() <= target)?.weightLbs ?? null
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Health</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Weight and body composition trends, synced from Renpho</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing…' : 'Sync Renpho'}</span>
          </button>
          {syncError && <p className="text-xs text-red-600 dark:text-red-400 max-w-xs text-right">{syncError}</p>}
          {syncSuccess && <p className="text-xs text-green-600 dark:text-green-400 max-w-xs text-right">{syncSuccess}</p>}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Weight</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {latest ? `${latest.weightLbs.toFixed(1)} lbs` : '—'}
          </p>
          {latest && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">as of {format(latest.date, 'MMM d, yyyy')}</p>
          )}
        </div>
        <ChangeStat label="7-Day Change" current={latest?.weightLbs ?? null} previous={findAsOf(7)} />
        <ChangeStat label="30-Day Change" current={latest?.weightLbs ?? null} previous={findAsOf(30)} />
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Body Fat</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {latest?.bodyFatPct != null ? `${latest.bodyFatPct.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <WeightProgressChart measurements={measurements} />

      {/* Raw history table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowTable(v => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            History ({measurements.length} {measurements.length === 1 ? 'entry' : 'entries'})
          </span>
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showTable && (
          <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Weight</th>
                  <th className="px-4 py-2 font-medium">Body Fat</th>
                  <th className="px-4 py-2 font-medium">Muscle</th>
                  <th className="px-4 py-2 font-medium">BMI</th>
                  <th className="px-4 py-2 font-medium">Lean Mass</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(m => (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{format(m.date, 'MMM d, yyyy')}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{m.weightLbs.toFixed(1)} lbs</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.bodyFatPct != null ? `${m.bodyFatPct.toFixed(1)}%` : '—'}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.musclePct != null ? `${m.musclePct.toFixed(1)}%` : '—'}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.bmi != null ? m.bmi.toFixed(1) : '—'}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{m.leanBodyMassLbs != null ? `${m.leanBodyMassLbs.toFixed(1)} lbs` : '—'}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
