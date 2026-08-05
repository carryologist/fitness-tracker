import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FREE_WEIGHT_ROUTINES } from '@/lib/freeWeights'
import { NavTabs } from '@/components/NavTabs'
import { ThemeToggle } from '@/components/ThemeToggle'

// See src/app/page.tsx for why routes under /freeweights are force-dynamic:
// middleware-based auth redirects don't run against a prerendered static shell.
export const dynamic = 'force-dynamic'

export default function FreeWeightsGlossaryPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <NavTabs />
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/freeweights"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Free Weights
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Exercise Glossary</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          What each exercise is and how to do it, before you start the timer.
        </p>

        {FREE_WEIGHT_ROUTINES.map(routine => (
          <div key={routine.id} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{routine.name} Day</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{routine.description}</p>
            <div className="space-y-4">
              {routine.exercises.map(exercise => (
                <div
                  key={exercise.id}
                  id={exercise.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm scroll-mt-20"
                >
                  <div className="flex items-baseline justify-between mb-1.5 gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {exercise.load === 'unilateral' ? 'one dumbbell, one side at a time' : 'both dumbbells together'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{exercise.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
