import type { Citation } from './types'

export const EVIDENCE_LIBRARY = {
  russell1980_circumplex: {
    id: 'russell1980_circumplex',
    title: 'A Circumplex Model of Affect',
    authors: 'Russell',
    year: 1980,
    source_type: 'paper',
    url: 'https://pdodds.w3.uvm.edu/research/papers/others/1980/russell1980a.pdf',
  },
  bradley_lang1994_sam: {
    id: 'bradley_lang1994_sam',
    title: 'Measuring Emotion: The Self-Assessment Manikin and the Semantic Differential',
    authors: 'Bradley and Lang',
    year: 1994,
    source_type: 'paper',
    url: 'https://www.sciencedirect.com/science/article/pii/0005791694900639',
  },
  watson1988_panas: {
    id: 'watson1988_panas',
    title: 'Development and Validation of Brief Measures of Positive and Negative Affect: PANAS',
    authors: 'Watson, Clark, and Tellegen',
    year: 1988,
    source_type: 'paper',
    url: 'https://ogg.osu.edu/media/documents/MB%20Stream/PANAS.pdf',
  },
  michie2011_comb: {
    id: 'michie2011_comb',
    title: 'The Behaviour Change Wheel: A New Method for Characterising and Designing Behaviour Change Interventions',
    authors: 'Michie, van Stralen, and West',
    year: 2011,
    source_type: 'paper',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21513547/',
  },
  rick2014_retail_therapy: {
    id: 'rick2014_retail_therapy',
    title: 'Making Purchase Decisions Reduces Residual Sadness',
    authors: 'Rick, Pereira, and Burson',
    year: 2014,
    source_type: 'paper',
    url: 'https://deepblue.lib.umich.edu/bitstream/handle/2027.42/141061/jcpy373.pdf',
  },
  online_impulse_meta_2021: {
    id: 'online_impulse_meta_2021',
    title: 'A Meta-Analysis of Online Impulsive Buying and the Moderating Effect of Economic Development Level',
    authors: 'Xiao and colleagues',
    year: 2021,
    source_type: 'meta-analysis',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8355873/',
  },
  cfpb_financial_well_being: {
    id: 'cfpb_financial_well_being',
    title: 'A Guide to Using the CFPB Financial Well-Being Scale',
    authors: 'Consumer Financial Protection Bureau',
    year: 2017,
    source_type: 'guide',
    url: 'https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/',
  },
} as const satisfies Record<string, Citation>

export type EvidenceId = keyof typeof EVIDENCE_LIBRARY

export function cite(...ids: EvidenceId[]): Citation[] {
  return ids.map((id) => EVIDENCE_LIBRARY[id])
}
