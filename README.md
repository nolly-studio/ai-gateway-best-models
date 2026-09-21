# bestmodels.dev

Daily picks for the best models on [Vercel AI Gateway](https://vercel.com/ai-gateway), plus a citable weekly ranking: ZDR + no-training defaults, and unrestricted bang-for-buck.

Live site: [https://www.bestmodels.dev](https://www.bestmodels.dev)

This is an independent ranking. Catalog, adoption, and DeepsecBench numbers come from Vercel AI Gateway data licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## What it ranks

- **Today (`/`)** — last complete export day. Displayed shares are that day; pick gates (adoption, the 3% workhorse floor) still use the 7-day mean. Rising’s fallback is day share minus the 7-day mean.
- **This week (`/week`)** — sliding 7-day mean. Same formulas as before. This is the ranking to cite.
- **Privacy lane** — models with zero data retention and no training (`zdr` + `no_training`)
- **Open lane** — the full catalog, including models that train or skip ZDR
- **Bang-for-buck** — DeepsecBench score / run cost
- **Value** — token share / blended $ per 1M (1-day on `/`, 7-day mean on `/week`)

See [the methodology](https://www.bestmodels.dev/methodology) for the exact filters.

## Data

`bun run gateway:value` fetches once and writes both snapshots. Week archives are appended only when the latest history week is at least 7 days old.

**`public/data/gateway.json` is the daily snapshot.** `tokensShare` / `spendShare` / `requestsShare` are one complete export day, not the 7-day mean. Consumers that want the weekly ranking should read `weekly.json`.

```bash
bun run gateway:value
```

Machine-readable endpoints on the live site:

- https://www.bestmodels.dev/data/gateway.json — daily (`cadence: "day"`)
- https://www.bestmodels.dev/data/weekly.json — 7-day (`cadence: "week"`)
- https://www.bestmodels.dev/data/history.json — week-by-week pick IDs
- https://www.bestmodels.dev/llms.txt — generated from both snapshots

Vercel `prebuild` regenerates the JSON on every deploy. The GitHub Action runs daily at 12:00 UTC: it commits a week archive when due, otherwise it fires a Vercel deploy hook (`VERCEL_DEPLOY_HOOK_URL`) so production refreshes without committing ~370KB files.

## Local

```bash
bun install
bun test
bun dev
```
