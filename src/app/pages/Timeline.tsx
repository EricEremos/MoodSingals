import { useEffect, useState } from 'react'
import { db, type Transaction } from '../../data/db'
import { formatLocalDate } from '../../utils/dates'

export default function Timeline() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const load = async () => {
      const tx = await db.transactions.orderBy('occurred_at').reverse().toArray()
      setTransactions(tx)
    }
    load()
  }, [])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Timeline</h1>
          <p className="section-subtitle">Recent transactions with local timestamps.</p>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Outflow</th>
              <th>Inflow</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 50).map((tx) => (
              <tr key={tx.id}>
                <td>{formatLocalDate(tx.occurred_at)}</td>
                <td>{tx.merchant}</td>
                <td>{tx.category}</td>
                <td>${tx.outflow.toFixed(2)}</td>
                <td>${tx.inflow.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
