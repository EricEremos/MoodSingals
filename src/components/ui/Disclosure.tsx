import type { ReactNode } from 'react'

type DisclosureProps = {
  title: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}

export default function Disclosure({ title, children, className = '', defaultOpen = false }: DisclosureProps) {
  return (
    <details className={`collapse ${className}`.trim()} open={defaultOpen}>
      <summary>{title}</summary>
      <div className="collapse-body">{children}</div>
    </details>
  )
}
