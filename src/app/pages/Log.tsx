import { useState } from 'react'
import MoodCheckin from '../../components/MoodCheckin'
import SpendMomentQuickLog from '../../components/SpendMomentQuickLog'

export default function Log() {
  const [status, setStatus] = useState('')

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Log</h1>
          <p className="section-subtitle">Quick inputs to build a daily habit loop.</p>
        </div>
      </div>

      {status ? <p className="helper">{status}</p> : null}

      <div className="grid" style={{ marginTop: 20 }}>
        <SpendMomentQuickLog onSaved={() => setStatus('Spend moment saved.')} />
        <MoodCheckin onSaved={() => setStatus('Mood saved.')} />
      </div>
    </div>
  )
}
