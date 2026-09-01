export const RANKING_RULES = {
  lookbackDays: 7,
  inputWeight: 3,
  outputWeight: 1,
  cheapBlendUsd: 0.5,
  workhorseMinBlendUsd: 0.5,
  midBlendUsd: 6,
  minContext: 128_000,
  minDeepsecScore: 12,
  minAaQuality: 40,
  workhorseMinTokenShare: 3,
  listLimit: 20,
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
    answer: `Bang-for-buck is a DeepsecBench run's score divided by that same run's cost — each run is kept intact, so a model's best score and its most efficient run are reported separately instead of mixed together. Adopted models win the homepage slot when any qualify, so a 0-token catalog row cannot. Value score is 7-day mean token share (missing days count as zero) divided by blended $/1M, using a ${RANKING_RULES.inputWeight}× input + ${RANKING_RULES.outputWeight}× output mix. On sale matches Vercel's official list-vs-sale promo on the models page — a cheaper third-party endpoint is a routing price, not a discount.`,
  },
  {
    question: "Which models count as capable?",
    answer: `Capable models support tool use and have at least ${RANKING_RULES.minContext.toLocaleString()} tokens of context. Vision is not required. Cheap routers blend at or under $${RANKING_RULES.cheapBlendUsd.toFixed(2)} / 1M and must clear a quality floor: Deepsec ≥ ${RANKING_RULES.minDeepsecScore} or an Artificial Analysis intelligence/coding index ≥ ${RANKING_RULES.minAaQuality}. Workhorses are the capable models people actually run (at least ${RANKING_RULES.workhorseMinTokenShare}% token share) at or under $${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M, excluding the cheap-router family, ranked on everyday Deepsec — AA intelligence is the fallback when nobody in that pool is benchmarked. Frontier is the highest AA intelligence among capable models at or under $${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M. Rising is the leftover capable model in that same usable band, ranked on AA first so a high-quality catalog row the other roles missed can surface; week-over-week token growth is the fallback when nobody leftover has AA.`,
  },
  {
    question: "What does the AA number mean?",
    answer:
      "AA intel / coding / agentic are Artificial Analysis headline indices, fetched from the Artificial Analysis Free API (OpenRouter is the fallback). They are never averaged with DeepsecBench. Frontier and rising rank on AA intelligence inside the usable price band (at or under $6 / 1M) — coding, then Deepsec, then cheaper blend break ties. A $10 model does not take a default slot. Workhorse still uses the everyday Deepsec run first, with AA as the fallback. Cheap routers may qualify on an AA floor when they have no Deepsec run. Ranked boards show the top 20 of each metric: intelligence, coding, bang, Deepsec score, on sale, cheap, tokens, and spend.",
  },
  {
    question: "Is this an official Vercel product?",
    answer:
      "No. bestmodels.dev is an independent weekly ranking. Catalog, adoption, and DeepsecBench numbers come from Vercel AI Gateway data licensed CC BY 4.0. We are not affiliated with Vercel.",
  },
]
