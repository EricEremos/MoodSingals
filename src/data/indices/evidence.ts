import type { Citation } from './types'

export const EVIDENCE_LIBRARY: Record<string, Citation> = {
  russell1980: {
    id: 'russell1980',
    title: 'A Circumplex Model of Affect',
    authors: 'Russell',
    year: 1980,
    source_type: 'paper',
    url: 'https://pdodds.w3.uvm.edu/research/papers/others/1980/russell1980a.pdf',
  },
  bradley1994: {
    id: 'bradley1994',
    title: 'Measuring emotion: The Self‑Assessment Manikin (SAM)',
    authors: 'Bradley & Lang',
    year: 1994,
    source_type: 'paper',
    url: 'https://www.sciencedirect.com/science/article/pii/0005791694900639',
  },
  watson1988: {
    id: 'watson1988',
    title: 'Positive and Negative Affect Schedule (PANAS)',
    authors: 'Watson et al.',
    year: 1988,
    source_type: 'paper',
    url: 'https://ogg.osu.edu/media/documents/MB%20Stream/PANAS.pdf',
  },
  michie2011: {
    id: 'michie2011',
    title: 'The Behaviour Change Wheel: a new method',
    authors: 'Michie et al.',
    year: 2011,
    source_type: 'paper',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21513547/',
  },
  rick2014: {
    id: 'rick2014',
    title: 'Making Purchase Decisions Reduces Residual Sadness',
    authors: 'Rick et al.',
    year: 2014,
    source_type: 'paper',
    url: 'https://deepblue.lib.umich.edu/bitstream/handle/2027.42/141061/jcpy373.pdf',
  },
  impulseMeta2021: {
    id: 'impulseMeta2021',
    title: 'Meta‑analysis of online impulsive buying and affect',
    authors: 'Various',
    year: 2021,
    source_type: 'meta-analysis',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8355873/',
  },
  cfpbWellbeing: {
    id: 'cfpbWellbeing',
    title: 'CFPB Financial Well‑Being Scale (Guide + Technical Report)',
    authors: 'CFPB',
    year: 2017,
    source_type: 'guide',
    url: 'https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/',
  },
}

export function cite(...ids: Array<keyof typeof EVIDENCE_LIBRARY>) {
  return ids.map((id) => EVIDENCE_LIBRARY[id])
}
