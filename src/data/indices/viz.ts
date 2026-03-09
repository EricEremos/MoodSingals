export type VizSpec =
  | { type: 'heatmap'; xLabels: string[]; yLabels: string[]; values: number[][] }
  | { type: 'bar'; labels: string[]; values: number[] }
  | { type: 'spark'; values: number[] }
  | { type: 'donut'; labels: string[]; values: number[] }
