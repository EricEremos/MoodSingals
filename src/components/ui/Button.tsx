import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  leadingIcon?: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'button button-primary',
  secondary: 'button button-muted',
  ghost: 'button button-ghost',
  destructive: 'button button-muted button-destructive',
}

export default function Button({
  variant = 'secondary',
  leadingIcon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `${variantClass[variant]} ${className}`.trim()
  return (
    <button className={classes} {...props}>
      {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
      {children}
    </button>
  )
}
