# Token Radar — pre-token protocols, ranked by implied value

[![Built with make.fun](https://img.shields.io/badge/Built%20with-make.fun-00A86B?style=flat)](https://make.fun/?ref=csc1bejp)

[![Built with Muse](https://img.shields.io/badge/Built%20with-Muse-7C5CFF?style=flat)](https://muse.ai)

A static dashboard that ranks pre-token protocols by implied value, from a sealed
DefiLlama snapshot. Every protocol the house rule admits is on the board — the 40
watchlist protocols at the $50M floor, plus 158 pre-token protocols below the floor —
198 rows in all. A token that already trades, and any wrapped, staked or bridged
product of one, is off the board.

## What this is

- **Input:** a sealed snapshot of 758 DefiLlama protocols (`snapshot.json`), each with
  TVL, 7-day change, listing date, chains, category, and token fields.
- **Model (radar-2):** `implied = TVL × category multiple × growth × maturity × chains`.
  Growth is the 7-day TVL change clamped to −60%…+120% and weighted 0.6. Maturity is
  0.6 + up to 0.4 for up to three years listed with no token (unknown age scores as
  one year). Chains adds 4% per chain past the first, up to 20%. The category
  multiple is stated in the open — derivatives venues 0.40, DEXs 0.35, lending 0.32,
  risk curators 0.30, bridges 0.10–0.12 — because tokens do not trade at one multiple
  of TVL. A category the table does not name takes 0.25.
- **Board:** all 198 admissible protocols, strongest implied value first, ranks 1–198,
  each with a six-step farm plan (capital, weekly habit, hold time, claim rule, log).
  The 24 live-token protocols are set aside on their own tab, largest market cap first.
- **Dashboard:** a static page with no network at all. Sortable and filterable board
  (search, category, chain, minimum TVL, watchlist only), a top-10 chart, a detail
  view that shows every factor of a row's implied value and recomputes it live, and a
  methodology section that prints the whole model, multiples included.

## Run it

```bash
# Needs Node.js 22.18+
node --experimental-strip-types main.ts --input /path/to/snapshot.json
# or, with a built Node that runs TypeScript directly:
node main.ts --input ../input/snapshot.json
```

The program writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json` into `$MAKEFUN_OUTPUT_DIR` (or `./out`). It runs twice and must write
identical bytes both times.

## Project layout

```
main.ts                  entry: reads the snapshot, writes the output
lib/model.ts             radar-2 model, farm plans, board checks
vendor/makefun-board.ts  the kit's dossier builder, byte for byte
dashboard/               the static page: index.html, app.css, app.js
screenshots/             the three screenshots (board, detail, filtered)
```

## How it was made

Built with Muse. Model, farm plans and dashboard written by the coding agent from the
competition kit and the sealed snapshot; `vendor/makefun-board.ts` is the kit's own
file, copied unchanged as the kit asks. Implied value is a model built only from this
snapshot, not a price and not a prediction. Farm at your own risk: never pay to claim
an airdrop, and claim only from the protocol's own published link.
