import { useState } from 'react'
import MoodCheckin from '../../components/MoodCheckin'
import SpendMomentQuickLog from '../../components/SpendMomentQuickLog'

export default function Today() {
  const [status, setStatus] = useState('')
  const [unlockHint, setUnlockHint] = useState('')

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Today</h1>
          <p className="section-subtitle">Two quick actions.</p>
        </div>
      </div>

      {status ? (
        <div className="card card-elevated" style={{ marginTop: 12 }}>
          <p className="helper">{status}</p>
          {unlockHint ? <p className="helper">{unlockHint}</p> : null}
        </div>
      ) : null}

      <div className="grid" style={{ marginTop: 20 }}>
        <SpendMomentQuickLog
          onSaved={() => {
            setStatus('Logged.')
            setUnlockHint('Unlocks: late‑night leak, stress triggers.')
          }}
        />
        <MoodCheckin
          onSaved={() => {
            setStatus('Logged.')
            setUnlockHint('Unlocks: mood → spend map, anchors.')
          }}
        />
      </div>
    </div>
  )
}
