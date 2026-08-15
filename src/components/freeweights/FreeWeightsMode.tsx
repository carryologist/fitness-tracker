'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoutinePicker } from './RoutinePicker'
import { ActiveSession, type SetState } from './ActiveSession'
import { SessionSummary } from './SessionSummary'
import {
  FREE_WEIGHT_ROUTINES,
  customSetVolume,
  mergeProgress,
  type FreeWeightProgressRow,
  type FreeWeightRoutine,
} from '@/lib/freeWeights'

type Screen = 'picker' | 'active' | 'summary'

const STORAGE_KEY = 'fitness-tracker-freeweights-session'

interface PersistedSession {
  routineId: string
  startedAt: number
  checked: Record<string, SetState[]>
}

function initialSets(routine: FreeWeightRoutine): Record<string, SetState[]> {
  return Object.fromEntries(
    routine.exercises.map(ex => [
      ex.id,
      Array.from({ length: ex.sets }, () => ({
        completed: false,
        actualReps: ex.reps,
        actualWeight: ex.weightPerDumbbell,
        actualWeightTiers: [ex.weightPerDumbbell],
      })),
    ])
  )
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (!parsed.routineId) return null
    // Back-compat: sessions persisted before multi-select weights shipped
    // won't have actualWeightTiers on each set. Backfill from actualWeight
    // so old in-progress sessions don't crash on resume.
    const checked = Object.fromEntries(
      Object.entries(parsed.checked ?? {}).map(([exerciseId, sets]) => [
        exerciseId,
        sets.map(s => ({
          ...s,
          actualWeightTiers: s.actualWeightTiers?.length ? s.actualWeightTiers : [s.actualWeight],
        })),
      ])
    )
    return { ...parsed, checked }
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
  // Code defaults, overlaid with DB progression once it loads (see effect
  // below). Kept as state — rather than a plain constant — so an
  // in-progress or just-finished session always reflects the current
  // baseline, not a stale snapshot from before the fetch resolved.
  const [routines, setRoutines] = useState<FreeWeightRoutine[]>(FREE_WEIGHT_ROUTINES)
  const [screen, setScreen] = useState<Screen>('picker')
  const [routineId, setRoutineId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, SetState[]>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finishedElapsedSeconds, setFinishedElapsedSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const routine = useMemo(
    () => (routineId ? routines.find(r => r.id === routineId) ?? null : null),
    [routines, routineId]
  )

  // Fetch current progression (Phase 2) and overlay it onto the code
  // defaults. Falls back silently to defaults if the fetch fails so this
  // never blocks starting a workout.
  useEffect(() => {
    let cancelled = false
    fetch('/api/freeweights/progress')
      .then(res => (res.ok ? res.json() : { progress: [] }))
      .then((data: { progress: FreeWeightProgressRow[] }) => {
        if (cancelled) return
        setRoutines(mergeProgress(FREE_WEIGHT_ROUTINES, data.progress ?? []))
      })
      .catch(() => {
        // Keep code defaults.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Restore an in-progress session (e.g. after an accidental tab close) on mount.
  useEffect(() => {
    const persisted = loadPersistedSession()
    if (!persisted) return
    setRoutineId(persisted.routineId)
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
      const completedVolume = sets
        .filter(s => s.completed)
        .reduce((setSum, s) => setSum + customSetVolume(ex, s.actualReps, s.actualWeight), 0)
      return sum + completedVolume
    }, 0)
  }, [routine, checked])

  const handleSelectRoutine = useCallback((selected: FreeWeightRoutine) => {
    const initialChecked = initialSets(selected)
    const now = Date.now()
    setRoutineId(selected.id)
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
          [exerciseId]: prev[exerciseId].map((s, i) => (i === setIndex ? { ...s, completed: !s.completed } : s)),
        }
        if (routineId && startedAt !== null) {
          savePersistedSession({ routineId, startedAt, checked: next })
        }
        return next
      })
    },
    [routineId, startedAt]
  )

  const handleEditSet = useCallback(
    (exerciseId: string, setIndex: number, actualReps: number, actualWeight: number, actualWeightTiers: number[]) => {
      setChecked(prev => {
        const next = {
          ...prev,
          [exerciseId]: prev[exerciseId].map((s, i) =>
            i === setIndex ? { ...s, actualReps, actualWeight, actualWeightTiers } : s
          ),
        }
        if (routineId && startedAt !== null) {
          savePersistedSession({ routineId, startedAt, checked: next })
        }
        return next
      })
    },
    [routineId, startedAt]
  )

  const handleFinish = useCallback(() => {
    setFinishedElapsedSeconds(elapsedSeconds)
    clearPersistedSession()
    setScreen('summary')
  }, [elapsedSeconds])

  const resetToPicker = useCallback(() => {
    setRoutineId(null)
    setChecked({})
    setStartedAt(null)
    setElapsedSeconds(0)
    setFinishedElapsedSeconds(0)
    setScreen('picker')
  }, [])

  const handleCancel = useCallback(() => {
    clearPersistedSession()
    resetToPicker()
  }, [resetToPicker])

  const elapsedMinutes = Math.max(1, Math.round(finishedElapsedSeconds / 60))

  const handleSave = useCallback(async () => {
    if (!routine) return
    setSaving(true)
    setError(null)
    try {
      const touchedExercises = routine.exercises.filter(ex => (checked[ex.id] ?? []).some(s => s.completed))
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
    resetToPicker()
  }, [resetToPicker])

  const handleDone = useCallback(() => {
    setSaved(false)
    resetToPicker()
  }, [resetToPicker])

  if (screen === 'active' && routine) {
    return (
      <ActiveSession
        routine={routine}
        checked={checked}
        elapsedSeconds={elapsedSeconds}
        totalVolume={totalVolume}
        onToggleSet={handleToggleSet}
        onEditSet={handleEditSet}
        onFinish={handleFinish}
        onCancel={handleCancel}
      />
    )
  }

  if (screen === 'summary' && routine) {
    return (
      <SessionSummary
        routine={routine}
        checked={checked}
        elapsedMinutes={elapsedMinutes}
        totalVolume={totalVolume}
        saving={saving}
        error={error}
        saved={saved}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onDone={handleDone}
      />
    )
  }

  return <RoutinePicker routines={routines} onSelect={handleSelectRoutine} />
}
