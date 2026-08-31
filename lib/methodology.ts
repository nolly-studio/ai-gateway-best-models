export const RANKING_RULES = {
  lookbackDays: 7,
  inputWeight: 3,
  outputWeight: 1,
  cheapBlendUsd: 0.5,
  midBlendUsd: 3,
  minContext: 128_000,
  minDeepsecScore: 12,
  workhorseMinTokenShare: 3,
} as const

export type SiteFaq = {
  question: string
  answer: string
}

export const STATIC_FAQS: SiteFaq[] = [
  {
    question: "What does ZDR + no training mean?",
    answer:
      "ZDR is zero data retention: the provider does not keep prompts. No training means prompts are not used to train models. The weekly cards badge ZDR when the priced route qualifies — not when the model family merely has a ZDR provider somewhere. A privacy route requires the catalog to mark both `zdr` and `no_training` as all or some, matching ?zdr=true and ?npt=true. `some` means only certain providers behind a model id qualify, so the ZDR price is the cheapest ZDR endpoint, even when a cheaper non-ZDR route exists.",
  },
  {
    question: "How is bang-for-buck calculated?",
    answer: `Bang-for-buck is a DeepsecBench run's score divided by that same run's cost — each run is kept intact, so a model's best score and its most efficient run are reported separately instead of mixed together. Value score is 7-day mean token share (missing days count as zero) divided by blended $/1M, using a ${RANKING_RULES.inputWeight}× input + ${RANKING_RULES.outputWeight}× output mix. On sale matches Vercel's official list-vs-sale promo on the models page — a cheaper third-party endpoint is a routing price, not a discount.`,
  },
  {
    question: "Which models count as capable?",
    answer: `Capable models support tool use and have at least ${RANKING_RULES.minContext.toLocaleString()} tokens of context. Vision is not required. Cheap routers must also blend at or under $${RANKING_RULES.cheapBlendUsd.toFixed(2)} / 1M. Workhorses blend at or under $${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M, hold at least ${RANKING_RULES.workhorseMinTokenShare}% token share, and rank on their everyday (lowest published effort) DeepsecBench score. Rising is the most-adopted capable model DeepsecBench has not benchmarked yet.`,
  },
  {
    question: "What does the AA number mean?",
    answer:
      "AA intel / coding / agentic are Artificial Analysis headline indices, fetched via OpenRouter and shown as a card footnote. They are never averaged with DeepsecBench. Frontier uses Deepsec first; AA intelligence is only a fallback when no capable model in the pool has a Deepsec run. Rising stays unbenchmarked until Deepsec lands, even if an AA score exists.",
  },
  {
    question: "Is this an official Vercel product?",
    answer:
      "No. bestmodels.dev is an independent weekly ranking. Catalog, adoption, and DeepsecBench numbers come from Vercel AI Gateway data licensed CC BY 4.0. We are not affiliated with Vercel.",
  },
]
