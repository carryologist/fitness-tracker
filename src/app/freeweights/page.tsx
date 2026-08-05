import { FreeWeightsMode } from '@/components/freeweights/FreeWeightsMode'
import { NavTabs } from '@/components/NavTabs'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AuthHeader } from '@/components/AuthHeader'

// See src/app/page.tsx for why this is force-dynamic: middleware-based auth
// redirects don't run against a prerendered static shell.
export const dynamic = 'force-dynamic'

export default function FreeWeightsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <NavTabs />
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <div className="hidden sm:block">
              <AuthHeader />
            </div>
          </div>
        </div>
      </header>
      <FreeWeightsMode />
    </main>
  )
}
