import { useEffect, useRef, useState } from 'react'
import { copy } from '../../utils/copy'

type OnboardingGuideModalProps = {
  open: boolean
  onClose: () => void
  onSkip: () => void
  onDone: () => void
  onSuppress30Days: () => void
}

const SWIPE_THRESHOLD = 48

export default function OnboardingGuideModal({
  open,
  onClose,
  onSkip,
  onDone,
  onSuppress30Days,
}: OnboardingGuideModalProps) {
  const [index, setIndex] = useState(0)
  const pointerStartX = useRef<number | null>(null)
  const pointerId = useRef<number | null>(null)
  const titleId = 'onboarding-guide-title'
  const slides = copy.onboarding.slides
  const lastIndex = slides.length - 1

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => setIndex(0))
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex((prev) => Math.min(prev + 1, lastIndex))
      if (event.key === 'ArrowLeft') setIndex((prev) => Math.max(prev - 1, 0))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = priorOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [lastIndex, onClose, open])

  if (!open) return null

  return (
    <div className="modal-backdrop onboarding-backdrop" onClick={onClose}>
      <section
        className="modal onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="onboarding-header">
          <p className="section-label">
            {index + 1}/{slides.length}
          </p>
          <button className="button button-ghost" type="button" onClick={onSkip}>
            {copy.onboarding.skip}
          </button>
        </div>

        <div
          className="onboarding-stage"
          onPointerDown={(event) => {
            pointerId.current = event.pointerId
            pointerStartX.current = event.clientX
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={(event) => {
            if (pointerId.current !== event.pointerId || pointerStartX.current === null) return
            const delta = event.clientX - pointerStartX.current
            if (delta <= -SWIPE_THRESHOLD) {
              setIndex((prev) => Math.min(prev + 1, lastIndex))
            } else if (delta >= SWIPE_THRESHOLD) {
              setIndex((prev) => Math.max(prev - 1, 0))
            }
            pointerId.current = null
            pointerStartX.current = null
          }}
          onPointerCancel={() => {
            pointerId.current = null
            pointerStartX.current = null
          }}
        >
          <div className="onboarding-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {slides.map((slide, slideIndex) => (
              <article className="onboarding-slide" key={slide.title}>
                <div className="onboarding-illustration" aria-hidden="true">
                  {slide.icon}
                </div>
                <h2 id={slideIndex === index ? titleId : undefined} className="page-title onboarding-title">
                  {slide.title}
                </h2>
                <p className="onboarding-sentence">{slide.sentence}</p>
                {slide.bullets?.length ? (
                  <ul className="onboarding-list">
                    {slide.bullets.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <div className="onboarding-dots" aria-label="Progress">
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.title}
              className={dotIndex === index ? 'dot dot-active' : 'dot'}
              type="button"
              aria-label={`Go to step ${dotIndex + 1}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-actions">
            <button className="button" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              {copy.onboarding.back}
            </button>
            {index === lastIndex ? (
              <button className="button button-primary" type="button" onClick={onDone}>
                {copy.onboarding.done}
              </button>
            ) : (
              <button className="button button-primary" type="button" onClick={() => setIndex(index + 1)}>
                {copy.onboarding.next}
              </button>
            )}
          </div>
          <div className="onboarding-secondary">
            <button className="button button-ghost" type="button" onClick={onSkip}>
              {copy.onboarding.skip}
            </button>
            <button className="button button-ghost" type="button" onClick={onSuppress30Days}>
              {copy.onboarding.suppress30Days}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
