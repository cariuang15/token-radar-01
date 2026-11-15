// Token Radar entry: read a sealed DefiLlama snapshot, rank its pre-token protocols by
// implied value, and write a static dashboard, a board.json, a data.js and a dossier.json.
//
//   node main.ts [--input path/to/snapshot.json]
//
// Input:  --input, or $MAKEFUN_INPUT_DIR/snapshot.json, or ./input/snapshot.json.
// Output: $MAKEFUN_OUTPUT_DIR, or ./out. The program runs twice and must write the same
// bytes both times: no wall clock, no randomness, no network, no unordered iteration.
//
// Output files:
//   board.json     {rows: BoardRow[]}   the ranked board, watchlist first by value
//   data.js        window.RADAR = ...;  the dashboard's data, beside dashboard/
//   dashboard/     the static page (index.html, app.css, app.js), no network at all
//   screenshots/   the three screenshots, copied through unchanged
//   dossier.json   the makefun dossier, written last, covering dashboard + screenshots
//
// The screenshots are taken by hand from the built page, at 1440x900, before the entry
// is submitted; the program checks there are three and refuses fewer.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, type DossierCaps } from './vendor/makefun-board.ts';
import {
  parseSnapshot,
  buildBoard,
  buildRadar,
  boardIssue,
  dataScript,
  SnapshotError,
  MODEL_VERSION,
} from './lib/model.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCREENSHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function flagValue(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) return null;
  return argv[index + 1];
}

function findInput(argv: string[]): string {
  const fromFlag = flagValue(argv, '--input');
  if (fromFlag) return fromFlag;
  const fromEnv = process.env.MAKEFUN_INPUT_DIR;
  if (fromEnv) return join(fromEnv, 'snapshot.json');
  return join(__dirname, 'input', 'snapshot.json');
}

function findOutput(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? join(process.cwd(), 'out');
}

function fail(message: string): never {
  console.error(`token-radar: ${message}`);
  process.exit(1);
}

function main(): void {
  const input = findInput(process.argv.slice(2));
  const output = findOutput();
  const dashboardSource = join(__dirname, 'dashboard');
  const screenshotsSource = join(__dirname, 'screenshots');
  if (!existsSync(input)) fail(`snapshot not found at ${input}`);
  if (!existsSync(dashboardSource)) fail(`dashboard not found at ${dashboardSource}`);
  if (!existsSync(screenshotsSource)) fail(`screenshots not found at ${screenshotsSource}`);

  let raw: string;
  try {
    raw = readFileSync(input, 'utf8');
  } catch (error) {
    fail(`cannot read ${input}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let snapshot;
  try {
    snapshot = parseSnapshot(JSON.parse(raw!));
  } catch (error) {
    if (error instanceof SnapshotError) fail(`bad snapshot: ${error.message}`);
    fail(`snapshot is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const board = buildBoard(snapshot!);
  const issue = boardIssue(board, snapshot!.watchlist);
  if (issue) fail(`board failed its own checks: ${issue}`);
  const radar = buildRadar(snapshot!);

  mkdirSync(output, { recursive: true });
  mkdirSync(join(output, 'dashboard'), { recursive: true });
  mkdirSync(join(output, 'screenshots'), { recursive: true });

  writeFileSync(join(output, 'board.json'), `${JSON.stringify({ rows: board }, null, 2)}\n`, 'utf8');
  writeFileSync(join(output, 'data.js'), dataScript(radar), 'utf8');

  for (const file of readdirSync(dashboardSource).sort()) {
    copyFileSync(join(dashboardSource, file), join(output, 'dashboard', file));
  }

  const shots = readdirSync(screenshotsSource)
    .filter((file) => SCREENSHOT_NAME.test(file))
    .sort();
  if (shots.length < 3) {
    fail(`need at least 3 screenshots in ${screenshotsSource}, found ${shots.length}`);
  }
  for (const file of shots) {
    copyFileSync(join(screenshotsSource, file), join(output, 'screenshots', file));
  }

  const dossierOptions: DossierCaps = {
    text_max_bytes: 65536,
    screenshots: { max: 4, max_bytes: 524288 },
    dashboard: { max_files: 400, max_bytes: 4194304 },
  };
  // buildDossier returns the dossier's bytes, not an object: write them as-is.
  // The scorer rebuilds the dossier from this output and compares bytes.
  const dossier = buildDossier(output, dossierOptions);
  writeFileSync(join(output, 'dossier.json'), dossier);

  const top = board[0];
  console.log(
    [
      `token-radar ${MODEL_VERSION}: ${board.length} rows, ` +
        `${radar.watchlist_covered} of ${radar.watchlist_size} watchlist covered`,
      `top: ${top.name} ($${top.implied_value_usd.toLocaleString('en-US')})`,
      `live-token protocols set aside: ${radar.live_rows.length}`,
      `screenshots: ${shots.join(', ')}`,
      `wrote ${output}`,
    ].join('\n'),
  );
}

main();
