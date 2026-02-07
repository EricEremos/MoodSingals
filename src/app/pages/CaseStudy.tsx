export default function CaseStudy() {
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Case Study</h1>
          <p className="section-subtitle">Problem → Insight → Approach.</p>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Problem</h2>
        <p className="helper">
          People overspend when stressed or tired and don’t see it coming.
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Insight</h2>
        <p className="helper">
          Emotion is the cause; spending is the behavior; outcome is a proxy for regret.
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Approach</h2>
        <p className="helper">Fast logs. Local‑first. Actionable insights.</p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Experiment</h2>
        <p className="helper">
          [estimate] 5‑task comprehension test. Measure accuracy + time on task.
        </p>
        <p className="helper">
          Measurement plan: run 10 users, record results in Research Mode export.
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Results</h2>
        <p className="helper">[estimate] Placeholder until Research Mode data exists.</p>
      </div>
    </div>
  )
}
