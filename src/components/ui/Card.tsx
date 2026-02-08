import type { ElementType, HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  elevated?: boolean
  as?: ElementType
}

export function Card({ elevated = false, className = '', children, as: Tag = 'section', ...props }: CardProps) {
  const classes = elevated ? `card card-elevated ${className}` : `card ${className}`
  return (
    <Tag className={classes.trim()} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`card-header ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
