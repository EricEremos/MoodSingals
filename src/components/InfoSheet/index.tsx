import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button, IconButton } from '../ui'

type InfoSheetProps = {
  title: string
  summary?: string
  triggerLabel?: string
  children: ReactNode
}

export default function InfoSheet({
  title,
  summary,
  triggerLabel = 'ⓘ',
  children,
}: InfoSheetProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = priorOverflow
    }
  }, [open])

  return (
    <>
      <IconButton
        label={title}
        icon={triggerLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      />
      {open ? (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <section
            className="info-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-sheet-header">
              <h3 id={titleId} className="card-title">
                {title}
              </h3>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            {summary ? <p className="body-subtle">{summary}</p> : null}
            <div className="info-sheet-body">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  )
}
