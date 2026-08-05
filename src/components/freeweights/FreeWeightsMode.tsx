'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoutinePicker } from './RoutinePicker'
import { ActiveSession } from './ActiveSession'
import { SessionSummary } from './SessionSummary'
import {
  getRoutine,
  setVolume,
  type FreeWeightRoutine,
} from '@/lib/freeWeights'

type Screen = 'picker' | 'active' | 'summary'

const STORAGE_KEY = 'fitness-tracker-freeweights-session'

interface PersistedSession {
  routineId: string
  startedAt: number
  checked: Record<string, boolean[]>
}

function emptyChecked(routine: FreeWeightRoutine): Record<string, boolean[]> {
  return Object.fromEntries(routine.exercises.map(ex => [ex.id, Array(ex.sets).fill(false)]))
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (!parsed.routineId || !getRoutine(parsed.routineId)) return null
    return parsed
  } catch {
    return null
  }
}

function savePersistedSession(session: PersistedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore — crash-safety is best-effort, not required for correctness
  }
}

function clearPersistedSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function FreeWeightsMode() {
  const [screen, setScreen] = useState<Screen>('picker')
  const [routine, setRoutine] = useState<FreeWeightRoutine | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean[]>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finishedElapsedSeconds, setFinishedElapsedSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore an in-progress session (e.g. after an accidental tab close) on mount.
  useEffect(() => {
    const persisted = loadPersistedSession()
    if (!persisted) return
    const restoredRoutine = getRoutine(persisted.routineId)
    if (!restoredRoutine) return
    setRoutine(restoredRoutine)
    setChecked(persisted.checked)
    setStartedAt(persisted.startedAt)
    setScreen('active')
  }, [])

  // Live timer while a session is active.
  useEffect(() => {
    if (screen !== 'active' || startedAt === null) return
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [screen, startedAt])

  const totalVolume = useMemo(() => {
    if (!routine) return 0
    return routine.exercises.reduce((sum, ex) => {
      const sets = checked[ex.id] ?? []
      const completedReps = sets.filter(Boolean).length * ex.reps
      return sum + setVolume(ex, completedReps)
    }, 0)
  }, [routine, checked])

  const setsCompleted = useMemo(
    () => Object.values(checked).reduce((sum, sets) => sum + sets.filter(Boolean).length, 0),
    [checked]
  )
  const totalSets = routine?.exercises.reduce((sum, ex) => sum + ex.sets, 0) ?? 0

  const handleSelectRoutine = useCallback((selected: FreeWeightRoutine) => {
    const initialChecked = emptyChecked(selected)
    const now = Date.now()
    setRoutine(selected)
    setChecked(initialChecked)
    setStartedAt(now)
    setElapsedSeconds(0)
    setSaved(false)
    setError(null)
    setScreen('active')
    savePersistedSession({ routineId: selected.id, startedAt: now, checked: initialChecked })
  }, [])

  const handleToggleSet = useCallback(
    (exerciseId: string, setIndex: number) => {
      setChecked(prev => {
        const next = {
          ...prev,
          [exerciseId]: prev[exerciseId].map((v, i) => (i === setIndex ? !v : v)),
        }
        if (routine && startedAt !== null) {
          savePersistedSession({ routineId: routine.id, startedAt, checked: next })
        }
        return next
      })
    },
    [routine, startedAt]
  )

  const handleFinish = useCallback(() => {
    setFinishedElapsedSeconds(elapsedSeconds)
    clearPersistedSession()
    setScreen('summary')
  }, [elapsedSeconds])

  const handleCancel = useCallback(() => {
    clearPersistedSession()
    setRoutine(null)
    setChecked({})
    setStartedAt(null)
    setElapsedSeconds(0)
    setScreen('picker')
  }, [])

  const elapsedMinutes = Math.max(1, Math.round(finishedElapsedSeconds / 60))

  const handleSave = useCallback(async () => {
    if (!routine) return
    setSaving(true)
    setError(null)
    try {
      const touchedExercises = routine.exercises.filter(ex => (checked[ex.id] ?? []).some(Boolean))
      const notes = `${routine.name} Day (Free Weights) — ${touchedExercises.map(ex => ex.name).join(', ')}`

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          source: 'Free Weights',
          activity: 'Weight Lifting',
          minutes: elapsedMinutes,
          weightLifted: totalVolume,
          notes,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to log workout (${res.status})`)
      }

      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log workout')
    } finally {
      setSaving(false)
    }
  }, [routine, checked, elapsedMinutes, totalVolume])

  const handleDiscard = useCallback(() => {
    setRoutine(null)
    setChecked({})
    setStartedAt(null)
    setElapsedSeconds(0)
    setFinishedElapsedSeconds(0)
    setScreen('picker')
  }, [])

  const handleDone = useCallback(() => {
    setRoutine(null)
    setChecked({})
    setStartedAt(null)
    setElapsedSeconds(0)
    setFinishedElapsedSeconds(0)
    setSaved(false)
    setScreen('picker')
  }, [])

  if (screen === 'active' && routine) {
    return (
      <ActiveSession
        routine={routine}
        checked={checked}
        elapsedSeconds={elapsedSeconds}
        totalVolume={totalVolume}
        onToggleSet={handleToggleSet}
        onFinish={handleFinish}
        onCancel={handleCancel}
      />
    )
  }

  if (screen === 'summary' && routine) {
    return (
      <SessionSummary
        routine={routine}
        elapsedMinutes={elapsedMinutes}
        totalVolume={totalVolume}
        setsCompleted={setsCompleted}
        totalSets={totalSets}
        saving={saving}
        error={error}
        saved={saved}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onDone={handleDone}
      />
    )
  }

  return <RoutinePicker onSelect={handleSelectRoutine} />
}
