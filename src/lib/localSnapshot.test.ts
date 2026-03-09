import { describe, expect, it } from 'vitest'
import { isLocalSnapshot, type LocalSnapshot } from './localSnapshot'

const snapshot: LocalSnapshot = {
  schemaVersion: 1,
  exportedAt: '2026-03-06T00:00:00.000Z',
  spend_moments: [],
  transactions: [],
  mood_logs: [],
  imports: [],
}

describe('isLocalSnapshot', () => {
  it('accepts the current snapshot shape', () => {
    expect(isLocalSnapshot(snapshot)).toBe(true)
  })

  it('rejects malformed payloads', () => {
    expect(isLocalSnapshot({ foo: 'bar' })).toBe(false)
    expect(isLocalSnapshot({ ...snapshot, transactions: null })).toBe(false)
  })
})
