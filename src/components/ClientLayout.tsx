'use client'

import { useEffect } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize theme on mount
    const initTheme = () => {
      const stored = localStorage.getItem('theme')
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      const theme = stored === 'light' || stored === 'dark' ? stored : systemTheme
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    initTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const stored = localStorage.getItem('theme')
      if (!stored || stored === 'system') {
        initTheme()
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return <>{children}</>
}