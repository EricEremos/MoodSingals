import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="card-title">{title}</p>
      {description ? <p className="body-subtle">{description}</p> : null}
      {action ? <div className="inline-list">{action}</div> : null}
    </div>
  )
}
