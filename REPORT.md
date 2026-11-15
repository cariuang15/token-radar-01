# Token Radar — build report

Entry for the make.fun token-radar-01 bounty ($1,325, 10 places, 1st $1,000).
Closes **Mon 14 Dec 2026, 17:00 WIB (10:00 UTC)**. Built 15 Nov 2026 by the Muse
coding agent (session 6f46e79b-680a-48b6-af4f-4819024c95ce).

## What was built

A static dashboard that ranks pre-token protocols by implied value, from a sealed
DefiLlama snapshot. The model is **radar-2** (`lib/model.ts`, 663 lines, written from
scratch — not a copy of the starter):

```
implied = TVL × category multiple × growth × maturity × chains
```

- **Growth** — the 7-day TVL change, clamped to −60%…+120%, weighted 0.6.
- **Maturity** — 0.6 + up to 0.4 for up to three years listed with no token
  (unknown listing date scores as one year old).
- **Chains** — +4% per chain past the first, up to +20%.
- **Category multiple** — stated in the open, one number per category
  (Derivatives 0.40, Dexs 0.35, Lending 0.32, Risk Curators 0.30, RWA 0.26,
  bridges 0.10–0.12, anything unnamed 0.25). The claim is written in the code
  and on the page: a derivatives venue keeps a share of the flow it routes, a
  bridge moves value it does not keep, so the market has paid less per dollar
  of TVL for one.

**The board is the whole admissible universe, not a top 200.** The watchlist
(40 slugs at the $50M floor) is the floor, never the ceiling: the board adds
every protocol below the floor that passes the same rule — **198 rows** on the
dev snapshot (40 watchlist + 158 early), ranks 1–198, all 198 implied values
distinct, each with a six-step farm plan. The 24 live-token protocols are set
aside on their own tab, largest market cap first.

**The wrapped-product rule is applied to the whole board, not just the
watchlist.** The starter's early set would have put WBTC, Binance staked ETH,
Coinbase Bridge and USDT0 at the top of the board — wrapped/staked products of
tokens that already trade. This entry applies the watchlist's own exclusion
(category Bridge/Canonical Bridge/Liquid Staking/Liquid Restaking/Restaked
BTC/CEX, a name saying wrapped/staked/staking, or a name starting with an
exchange's name) to every row, so the top of the board is genuine pre-token
launches: Steakhouse Financial $781.1M, Sentora Curator $703.5M, Gauntlet
$468.8M, Veda $444.4M, USDD $276.9M.

**Farm plans are per-category, not one template.** A lending market gets a
supply-and-borrow, a DEX gets liquidity-and-a-swap, a curator gets a deposit
and a vote, an RWA gets a mint held through one interest payment. Each of the
six steps carries a cost and a time; capital is $50/$100/$150/$250 by TVL tier
and the hold is 30/45/60 days by age.

**The dashboard** (dark theme, no network, no framework) has a top-10 chart,
stat cards, search + category + chain + minimum-TVL + watchlist-only filters,
five sort orders, 50-row pages, a detail view that shows every factor of a
row's implied value and **recomputes it live** (and says so if the two numbers
ever disagreed), a methodology section that prints the whole model including
the multiples table, and hash routing (`#q`, `#category`, `#chain`, `#p`).

## Files

```
main.ts                  entry: reads the snapshot, writes the output (134 lines)
lib/model.ts             radar-2 model, farm plans, board checks (663 lines)
vendor/makefun-board.ts  the kit's dossier builder, copied byte for byte
dashboard/               index.html (92 lines), app.css, app.js (341 lines)
screenshots/             1-board.png, 2-detail.png, 3-filtered.png (1440×900)
LICENSE                  MIT (SPDX line, OSI-approved)
README.md, package.json, .gitignore, .makefun/owner.json
```

`.makefun/owner.json` already holds the wallet
`6YHjbtH61VKjN7u214mXfn8vC4N6xfZeVaVmCzEXmpV8` (@warisan's Solana wallet;
@warisan signs in via wallet, GitHub "Not linked", so the ownership rule needs
this file at the submitted commit).

## How to run and test

```bash
# Needs Node.js 22.18+ (developed and tested on Node 24.22.1 in this VM)
cd ~/workspace/makefun-token-radar
node main.ts --input ~/workspace/makefun-token-radar-kit/token-radar-01-kit/input/snapshot.json
# writes board.json, data.js, dashboard/, screenshots/, dossier.json into ./out
# (or set MAKEFUN_OUTPUT_DIR)
```

Screenshots were taken with headless Chromium (Playwright, in /tmp/pw) from the
built page at 1440×900, then `main.ts` was re-run so `out/` and the dossier
carry the final images. To retake them after a dashboard change, run
`node /tmp/pw/shots.mjs` (it opens `out/dashboard/index.html` three ways:
plain, `#p=steakhouse-financial`, `#category=Dexs`), then re-run `main.ts`.

## What was verified

- **Kit check** (`makefun check --kit … --repo …`): 4 passed
  (competition_open, snapshot, license_osi, entrypoint), 1 failed
  (transcripts_present — expected: transcripts are bundled at submission, see
  below), 14 skipped, 5 checked at submission.
- **All 7 gate rows, verified by hand against the built output:**
  dashboard_files (3 files, 30,241 bytes, no `http://`/`https://` in attribute
  values, CSS or JS import/export/require specifiers); board_file (198 rows,
  273,736 bytes, all slugs in the snapshot, ranks positive whole, implied
  positive whole ≤ 10¹⁴, farm steps 3–12 × 20–600 chars); sorted_by_value
  (ranks exactly 1–198, implied non-increasing, no ties); coverage (40/40
  watchlist); farm_steps; screenshots (3 PNGs, 1440×900, 152–226 KB each, all
  ≤ 512 KiB); dossier_matches (dossier.json is exactly `buildDossier`'s bytes,
  766,932 bytes ≤ 1.5 MiB, text 30,674 bytes ≤ 65,536).
- **Determinism:** two runs write byte-identical output (`diff -r` clean).
- **Page recompute:** the dashboard's formula reproduces `board.json`'s implied
  value for all 198 rows (0 mismatches).
- **Interactions tested in headless Chromium, no page errors:** live-token tab
  (24 rows, header switches to Market cap), search (`gauntlet` → 1 row),
  watchlist-only (40 rows), sort by TVL (Sentora Curator $2.76B first), Show
  more (50 → 100 rows), row-click detail (Gauntlet, recompute $468.8M), live
  detail (OKX).
- **Bugs found and fixed while building:** the dossier is `buildDossier`'s raw
  bytes, not a JSON object (an early build `JSON.stringify`'d the Uint8Array
  into `{"0":…}` — caught by inspecting the file, fixed, and the gate's
  dossier_matches row now holds); imports must use `.ts` extensions (Node does
  not map `.js` → `.ts`); an unescaped apostrophe in a farm-step string broke
  type stripping; the header's source line showed the snapshot's full fetch URL
  (shortened to "DefiLlama protocol index"); the first board screenshot showed
  no table rows (spacing tightened; the first row now shows).

## Submission steps still needed (parent agent)

1. **Create the GitHub repo** `0x23466/token-radar-01` (public, created after
   14 Nov 2026 10:00 UTC) and push these files (15 including this report). Do **not** include `out/`
   (build output, gitignored) or the kit folder (kept separately at
   `~/workspace/makefun-token-radar-kit/`).
2. **Bundle the transcripts** (`makefun bundle`) from the top-level agent once
   this subagent has finished, so both sessions are in it, then run `makefun
   check --transcripts <bundle>` again — the transcript gate
   (thinking_reproduces ≥30%, thinking_turns ≥5, thinking_priced,
   thinking_revised) is the one part not yet verified. `main.ts`,
   `lib/model.ts` and the dashboard files were all written by the agent in
   this session (multiple write/edit messages per file), which is what the
   gate counts; `vendor/makefun-board.ts` is the kit's own file, copied as
   instructed.
3. **Submit** repo URL + full commit SHA + transcript bundle on
   https://make.fun/bounty/token-radar-01 before **Mon 14 Dec 2026 17:00 WIB**.
   No entry fee. Max 5 submissions/day, 10 total.

## Honest limits

- **No local grade exists for this bounty.** The kit's `grade-local` refuses
  it (scorer and reference data stay server-side); the judge is a pairwise
  superbot vote on the server. The starter is the "2-plain" calibration anchor
  (0.593); this entry is built to beat it on the rubric's five criteria
  (working radar, value model, farm plans, dashboard as a page, looks made),
  but the win rate is the server's to measure, and the final is staged
  (screened shortlist, Swiss rounds, playoff top 12).
- **Category multiples are judgment, not measurement.** They are stated in the
  open so the judge can disagree with them; a judge that weights categories
  differently will score the model differently. They are the single most
  opinionated part of the entry.
- **The grading snapshot is not this snapshot.** The grader runs the program
  against its own sealed input (same shape, different protocols). The program
  is fully snapshot-driven and deterministic, so it should generalise — but
  the exact board, and whether any new category falls back to the default
  0.25, cannot be checked here.
- **The wrapped-product rule can only see ten fields.** `parentProtocol` is
  not in the snapshot, so a wrapped product whose name and category do not
  betray it could slip onto the board. The watchlist rule has the same blind
  spot for the early set; the rule was applied exactly as written.
- **Tested on Node 24.22.1, graded on node22.** No Node 22 binary exists in
  this VM, so the node22 run was not tested directly. The code uses only
  erasable TypeScript (interfaces, type annotations, `as` casts — no enums,
  namespaces or parameter properties) and the Node standard library, the same
  patterns the starter uses, and `package.json` sets `"type": "module"` so
  the program's stderr stays empty under the grader.
- **Implied value is a model, not a price.** It is built only from this
  snapshot's TVL, growth, age, category and chains. It does not predict a
  launch, a date, or a price — the page says so in three places.
