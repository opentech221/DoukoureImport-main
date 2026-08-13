import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'success' | 'danger' | 'neutral'
  children: ReactNode
}

const buttonToneClass: Record<NonNullable<ButtonProps['tone']>, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  success: 'bg-success text-white hover:bg-emerald-700',
  danger: 'bg-danger text-white hover:bg-red-700',
  neutral: 'border border-border bg-card text-text hover:bg-surface-muted',
}

export function Button({ tone = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`di-control-radius inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${buttonToneClass[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

interface BadgeProps {
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  children: ReactNode
}

const badgeToneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-amber-soft text-amber',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-muted text-text-muted',
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeToneClass[tone]}`}>
      {children}
    </span>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <label htmlFor={inputId} className="grid gap-1.5 text-sm font-semibold text-text">
      {label}
      <input
        {...props}
        id={inputId}
        className={`di-control-radius min-h-10 border border-border bg-card px-3 text-sm text-text shadow-sm placeholder:text-text-subtle ${className}`}
      />
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`di-card p-4 ${className}`}>{children}</section>
}
