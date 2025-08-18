import { 
  getQuarter, 
  getYear, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear, 
  isWithinInterval,
  differenceInDays,
  differenceInWeeks
} from 'date-fns'
import { WorkoutSession, Goal, GoalProgress } from '../components/WorkoutDashboard'

export function calculateGoalProgress(goal: Goal, sessions: WorkoutSession[]): GoalProgress {
  const now = new Date()
  const currentQuarter = getQuarter(now)
  const currentYear = getYear(now)
  
  // Time periods
  const quarterStart = startOfQuarter(now)
  const quarterEnd = endOfQuarter(now)
  const yearStart = startOfYear(now)
  const yearEnd = endOfYear(now)
  
  // Filter sessions for current periods
  const quarterSessions = sessions.filter(session => 
    isWithinInterval(session.date, { start: quarterStart, end: quarterEnd })
  )
  const yearSessions = sessions.filter(session => 
    isWithinInterval(session.date, { start: yearStart, end: yearEnd })
  )
  
  // Calculate actual progress
  const actualWeightQuarter = quarterSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
  const actualWeightYear = yearSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
  const actualMinutesQuarter = quarterSessions.reduce((sum, s) => sum + s.minutes, 0)
  const actualMinutesYear = yearSessions.reduce((sum, s) => sum + s.minutes, 0)
  const actualSessionsQuarter = quarterSessions.length
  const actualSessionsYear = yearSessions.length
  
  // Calculate expected progress (linear based on time elapsed)
  const daysIntoQuarter = differenceInDays(now, quarterStart) + 1
  const totalDaysInQuarter = differenceInDays(quarterEnd, quarterStart) + 1
  const quarterProgress = daysIntoQuarter / totalDaysInQuarter
  
  const daysIntoYear = differenceInDays(now, yearStart) + 1
  const totalDaysInYear = differenceInDays(yearEnd, yearStart) + 1
  const yearProgress = daysIntoYear / totalDaysInYear
  
  const expectedWeightQuarter = goal.quarterlyWeightTarget * quarterProgress
  const expectedWeightYear = goal.annualWeightTarget * yearProgress
  const expectedMinutesQuarter = goal.quarterlyMinutesTarget * quarterProgress
  const expectedMinutesYear = goal.annualMinutesTarget * yearProgress
  const expectedSessionsQuarter = goal.quarterlySessionsTarget * quarterProgress
  const expectedSessionsYear = (goal.weeklySessionsTarget * 52) * yearProgress
  
  // Calculate sessions needed to hit targets
  const sessionsNeededForQuarter = Math.max(0, 
    goal.quarterlySessionsTarget - actualSessionsQuarter
  )
  const sessionsNeededForYear = Math.max(0, 
    (goal.weeklySessionsTarget * 52) - actualSessionsYear
  )
  
  // Calculate days remaining in quarter
  const daysRemainingInQuarter = Math.max(0, differenceInDays(quarterEnd, now))
  
  return {
    currentQuarter,
    currentYear,
    actualWeightLifted: {
      quarterToDate: actualWeightQuarter,
      yearToDate: actualWeightYear
    },
    actualMinutes: {
      quarterToDate: actualMinutesQuarter,
      yearToDate: actualMinutesYear
    },
    actualSessions: {
      quarterToDate: actualSessionsQuarter,
      yearToDate: actualSessionsYear
    },
    expectedWeightLifted: {
      quarterToDate: expectedWeightQuarter,
      yearToDate: expectedWeightYear
    },
    expectedMinutes: {
      quarterToDate: expectedMinutesQuarter,
      yearToDate: expectedMinutesYear
    },
    expectedSessions: {
      quarterToDate: expectedSessionsQuarter,
      yearToDate: expectedSessionsYear
    },
    sessionsNeededForQuarter,
    sessionsNeededForYear,
    daysRemainingInQuarter
  }
}

export function createGoal(
  name: string,
  year: number,
  annualWeightTarget: number,
  minutesPerSession: number,
  weeklySessionsTarget: number
): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> {
  const weeklyMinutesTarget = minutesPerSession * weeklySessionsTarget
  
  return {
    name,
    year,
    annualWeightTarget,
    minutesPerSession,
    weeklySessionsTarget,
    weeklyMinutesTarget,
    annualMinutesTarget: weeklyMinutesTarget * 52,
    quarterlyWeightTarget: annualWeightTarget / 4,
    quarterlyMinutesTarget: (weeklyMinutesTarget * 52) / 4,
    quarterlySessionsTarget: weeklySessionsTarget * 13
  }
}