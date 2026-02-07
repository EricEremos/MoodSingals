import type { InsightCardResult, InsightContext } from '../index'

export function unlinkedShareCard(context: InsightContext): InsightCardResult {
  const unlinkedCount = context.linked.filter((tx) => !tx.linkedMood).length
  const total = context.linked.length
  const share = total ? (unlinkedCount / total) * 100 : 0

  return {
    id: 'unlinked-share',
    title: 'Unlinked Spend Share',
    insight:
      total > 0
        ? `${share.toFixed(1)}% of transactions have no nearby mood check-in.`
        : 'No transactions to link yet.',
    data: { share },
    vizSpec: {
      type: 'donut',
      labels: ['Linked', 'Unlinked'],
      values: [total - unlinkedCount, unlinkedCount],
    },
    microAction: 'Add a quick mood check-in after any notable spend.',
    confidence: context.confidence,
    howComputed: 'Calculates share of transactions without a recent mood log.',
    relevance: total ? 0.65 : 0.3,
  }
}
