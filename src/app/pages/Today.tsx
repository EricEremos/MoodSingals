import { useState } from 'react'
import MoodCheckin from '../../components/MoodCheckin'
import SpendMomentQuickLog from '../../components/SpendMomentQuickLog'
import InfoSheet from '../../components/InfoSheet'
import { copy } from '../../utils/copy'

export default function Today() {
  const [status, setStatus] = useState('')

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <h2 className="page-title">{copy.today.title}</h2>
        </div>
        <InfoSheet title={copy.today.infoTitle}>
          <ul className="sheet-list">
            {copy.today.infoBody.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </InfoSheet>
      </div>

      {status ? (
        <div className="card card-elevated">
          <div className="section-label">{copy.today.statusTitle}</div>
          <div className="body-subtle">{status}</div>
        </div>
      ) : null}

      <div className="grid grid-2">
        <MoodCheckin
          onSaved={() => {
            setStatus(`${copy.today.saved} ${copy.today.moodUnlock}`)
          }}
        />
        <SpendMomentQuickLog
          onSaved={() => {
            setStatus(`${copy.today.saved} ${copy.today.spendUnlock}`)
          }}
        />
      </div>
    </div>
  )
}
