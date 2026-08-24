'use client'

import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, subMonths, isAfter } from 'date-fns'
import { BodyMeasurement } from '@/types/health'

type RangeMode = '30d' | '90d' | '6m' | '1y' | 'all'

const RANGE_OPTIONS: { value: RangeMode; label: string }[] = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
]

const SECONDARY_METRICS: { key: keyof BodyMeasurement; label: string; color: string }[] = [
  { key: 'bodyFatPct', label: 'Body Fat %', color: '#f97316' },
  { key: 'musclePct', label: 'Muscle %', color: '#8b5cf6' },
  { key: 'leanBodyMassLbs', label: 'Lean Mass (lbs)', color: '#10b981' },
]

interface WeightProgressChartProps {
  measurements: BodyMeasurement[]
}

export function WeightProgressChart({ measurements }: WeightProgressChartProps) {
  const [range, setRange] = useState<RangeMode>('90d')
  const [secondaryMetric, setSecondaryMetric] = useState<keyof BodyMeasurement | 'none'>('none')

  const filtered = useMemo(() => {
    if (range === 'all') return measurements
    const now = new Date()
    const cutoff =
      range === '30d' ? subDays(now, 30) :
      range === '90d' ? subDays(now, 90) :
      range === '6m' ? subMonths(now, 6) :
      subMonths(now, 12)
    return measurements.filter(m => isAfter(m.date, cutoff))
  }, [measurements, range])

  const chartData = useMemo(() => {
    return filtered.map(m => ({
      dateLabel: format(m.date, 'MMM d'),
      weight: Math.round(m.weightLbs * 10) / 10,
      secondary:
        secondaryMetric !== 'none' && typeof m[secondaryMetric] === 'number'
          ? Math.round((m[secondaryMetric] as number) * 10) / 10
          : undefined,
    }))
  }, [filtered, secondaryMetric])

  if (measurements.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
          No weight data yet. Connect Renpho and sync to see your trend.
        </p>
      </div>
    )
  }

  const activeSecondary = SECONDARY_METRICS.find(m => m.key === secondaryMetric)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Weight Trend</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={secondaryMetric}
            onChange={e => setSecondaryMetric(e.target.value as keyof BodyMeasurement | 'none')}
            className="text-xs font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-300"
          >
            <option value="none">Weight only</option>
            {SECONDARY_METRICS.map(m => (
              <option key={m.key} value={m.key}>+ {m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} minTickGap={30} />
            <YAxis yAxisId="weight" domain={['auto', 'auto']} tick={{ fontSize: 12 }} width={40} />
            {activeSecondary && (
              <YAxis yAxisId="secondary" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 12 }} width={40} />
            )}
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8 }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              name="Weight (lbs)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {activeSecondary && (
              <Line
                yAxisId="secondary"
                type="monotone"
                dataKey="secondary"
                name={activeSecondary.label}
                stroke={activeSecondary.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
