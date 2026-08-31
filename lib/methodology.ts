export const RANKING_RULES = {
  lookbackDays: 7,
  inputWeight: 3,
  outputWeight: 1,
  cheapBlendUsd: 0.5,
  midBlendUsd: 3,
  minContext: 128_000,
  minDeepsecScore: 12,
} as const

export type SiteFaq = {
  question: string
  answer: string
}

export const STATIC_FAQS: SiteFaq[] = [
  {
    question: "What does ZDR + no training mean?",
    answer:
      "ZDR is zero data retention: the provider does not keep prompts. No training means prompts are not used to train models. A privacy pick requires the AI Gateway catalog to mark both `zdr` and `no_training` as all or some, matching the official ?zdr=true and ?npt=true filters.",
  },
  {
    question: "How is bang-for-buck calculated?",
    answer: `Bang-for-buck is DeepsecBench score divided by that run's cost. Value score is 7-day mean token share divided by blended $/1M, using a ${RANKING_RULES.inputWeight}× input + ${RANKING_RULES.outputWeight}× output mix. Discounted picks use a cheaper ZDR endpoint than list price.`,
  },
  {
    question: "Which models count as capable?",
    answer: `Capable models support tool use and have at least ${RANKING_RULES.minContext.toLocaleString()} tokens of context. Vision is not required. Cheap routers must also blend at or under $${RANKING_RULES.cheapBlendUsd.toFixed(2)} / 1M; workhorses at or under $${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M.`,
  },
  {
    question: "Is this an official Vercel product?",
    answer:
      "No. bestmodels.dev is an independent weekly ranking. Catalog, adoption, and DeepsecBench numbers come from Vercel AI Gateway data licensed CC BY 4.0. We are not affiliated with Vercel.",
  },
]
