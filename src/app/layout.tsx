import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fitness Tracker',
  description: 'Track your workouts, monitor progress, and achieve your fitness goals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
