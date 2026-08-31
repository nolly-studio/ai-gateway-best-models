# bestmodels.dev

Weekly picks for the best models on [Vercel AI Gateway](https://vercel.com/ai-gateway): ZDR + no-training defaults, and unrestricted bang-for-buck.

Live site: [https://bestmodels.dev](https://bestmodels.dev)

This is an independent ranking. Catalog, adoption, and DeepsecBench numbers come from Vercel AI Gateway data licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## What it ranks

- **Privacy lane** — models with zero data retention and no training (`zdr` + `no_training`)
- **Open lane** — the full catalog, including models that train or skip ZDR
- **Bang-for-buck** — DeepsecBench score / run cost
- **Value** — 7-day token share / blended $ per 1M

See [the methodology](https://bestmodels.dev/methodology) for the exact filters.

## Data

Each build refreshes `public/data/gateway.json` and appends `public/data/history.json`.

```bash
bun run gateway:value
```

Machine-readable endpoints on the live site:

- https://bestmodels.dev/data/gateway.json
- https://bestmodels.dev/data/history.json
- https://bestmodels.dev/llms.txt (generated from the current snapshot)

## Local

```bash
bun install
bun test
bun dev
```
