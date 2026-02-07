import CSVWizard from '../../components/CSVWizard'

export default function Import() {
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Import</h1>
          <p className="section-subtitle">Optional history import.</p>
        </div>
      </div>

      <CSVWizard />
    </div>
  )
}
