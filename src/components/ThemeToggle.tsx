'use client'

import { useTheme } from './ThemeProvider'
import { Moon, Sun, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors relative group ${
          theme === 'light' 
            ? 'bg-white dark:bg-gray-700 text-yellow-500 shadow-sm' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Light Mode
        </span>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors relative group ${
          theme === 'system' 
            ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        aria-label="System mode"
      >
        <Monitor className="w-4 h-4" />
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          System
        </span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors relative group ${
          theme === 'dark' 
            ? 'bg-white dark:bg-gray-700 text-purple-500 shadow-sm' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Dark Mode
        </span>
      </button>
    </div>
  )
}