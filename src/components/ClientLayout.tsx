'use client'

import { useEffect, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {mounted && <ThemeToggle />}
      {children}
    </>
  )
}