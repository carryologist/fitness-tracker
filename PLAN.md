# Plan: Default Cycling Speed Setting & Auto-Mileage Calculation

## Overview
Add a configurable "Default Cycling Speed" setting (17/18/19 mph) that automatically calculates mileage for cycling workouts that have no miles recorded from the source. Formula: `miles = minutes * (speed / 60)`.

## Changes

### 1. `src/context/SettingsContext.tsx`
- Add `defaultCyclingSpeed: number` to the `Settings` interface (default: `18`)

### 2. `src/utils/workoutMultipliers.ts`
- Add a new exported function `applyDefaultMileage(sessions, defaultCyclingSpeed)` that:
  - For any session where `activity` is "Cycling" and `miles` is falsy (null/undefined/0), calculates `miles = minutes * (defaultCyclingSpeed / 60)`
  - Sets a flag `estimatedMiles: true` so the UI can distinguish calculated vs. recorded mileage
  - Non-cycling sessions and sessions with existing mileage pass through unchanged

### 3. `src/components/WorkoutDashboard.tsx`
- In the `enhancedSessions` pipeline, call `applyDefaultMileage()` **before** `applyWorkoutMultipliers()` so Cannondale outdoor cycling also gets default mileage filled in before the multiplier
- Wire `settings.defaultCyclingSpeed` through
- Add a "Default Cycling Speed" section to the Settings modal (between Outdoor Bonus and Units), with 17/18/19 mph toggle buttons matching the existing button style

### 4. `src/components/WorkoutTable.tsx`
- Add the `estimatedMiles` field to the interface
- When a session has `estimatedMiles: true`, show a small indicator (e.g. italic or a calc icon) so the user can see the mileage was estimated

## What Won't Change
- Database schema — no new columns; this is purely a client-side display calculation
- API routes — mileage estimation happens at render time
- WorkoutSummary / MonthlySummary — they already read `miles` / `adjustedMiles` from sessions, so they'll automatically pick up the calculated values
