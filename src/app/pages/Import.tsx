import CSVWizard from '../../components/CSVWizard'

export default function Import() {
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Import</h1>
          <p className="section-subtitle">
            Optional: backfill history to improve insights. Local only.
          </p>
        </div>
        <div className="tag">Secondary</div>
      </div>

      <CSVWizard />
    </div>
  )
}
