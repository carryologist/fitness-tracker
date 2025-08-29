import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full px-4 py-3 bg-white dark:bg-dark-card',
          'border-2 rounded-lg',
          'text-gray-900 dark:text-gray-100',
          'placeholder-gray-400 dark:placeholder-gray-500',
          'transition-all duration-150',
          'focus:outline-none focus:ring-4',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
            : 'border-gray-200 dark:border-dark-border focus:border-primary-500 focus:ring-primary-500/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }