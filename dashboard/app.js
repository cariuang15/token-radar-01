// Token Radar dashboard: renders window.RADAR with no network at all.
//
// The page recomputes every row's implied value from the row's own figures, with the
// same radar-2 formula the program used, and says so in the detail view: if the page's
// number and board.json's number ever disagreed, that row would be wrong. Nothing here
// fetches, and nothing here trusts today's date: age comes from the snapshot.

const RADAR = window.RADAR;
const PAGE_SIZE = 50;

/** Implied dollars per dollar of TVL, by category: the same table lib/model.ts uses. */
const CATEGORY_MULTIPLE = {
  Derivatives: 0.4, Dexs: 0.35, Lending: 0.32, CDP: 0.3, 'CDP Manager': 0.3,
  'Risk Curators': 0.3, 'Onchain Capital Allocator': 0.3, 'Basis Trading': 0.3,
  'Interest Rate Derivatives': 0.3, 'Leveraged Farming': 0.3, 'Prediction Market': 0.28,
  'Uncollateralized Lending': 0.28, 'Collateral Markets': 0.28, Yield: 0.26, RWA: 0.26,
  'Yield Aggregator': 0.24, 'Liquidity Manager': 0.24, Indexes: 0.24, Restaking: 0.22,
  'Liquid Restaking': 0.2, 'Staking Pool': 0.2, 'Liquid Staking': 0.18,
  'Decentralized BTC': 0.18, 'Anchor BTC': 0.18, 'Restaked BTC': 0.15,
  'Dual-Token Stablecoin': 0.15, 'Stablecoin Wrapper': 0.15, Bridge: 0.12,
  'Cross Chain Bridge': 0.12, 'Canonical Bridge': 0.1, Chain: 0.2, CeDeFi: 0.2,
  Farm: 0.22, 'Governance Incentives': 0.2, Insurance: 0.22, 'OTC Marketplace': 0.2,
  Payments: 0.2, 'Crypto Card Issuer': 0.2,
};
const DEFAULT_MULTIPLE = 0.25;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function fmtMoney(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(v);
}
function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  const s = (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  return v >= 0 ? s : s;
}
function fmtAge(days) {
  if (days === null || days === undefined) return '—';
  if (days < 30) return days + 'd';
  if (days < 365) return Math.round(days / 30) + 'mo';
  return (days / 365).toFixed(1) + 'y';
}
function fmtChains(chains) {
  if (!chains || chains.length === 0) return '—';
  return chains.slice(0, 2).join(', ') + (chains.length > 2 ? ` +${chains.length - 2}` : '');
}

/** The radar-2 formula, from a row's own figures: TVL x category x growth x maturity x chains. */
function impliedOf(row) {
  const cm = row.category_multiple ?? (CATEGORY_MULTIPLE[row.category] ?? DEFAULT_MULTIPLE);
  const gm = row.growth_multiplier ?? 1;
  const mm = row.maturity_multiplier ?? 1;
  const chm = row.chain_multiplier ?? 1;
  return Math.max(1, Math.round(row.tvl_usd * cm * gm * mm * chm));
}

/** The capital a farm step puts at risk, by TVL tier: the same rule lib/model.ts uses. */
function capitalFor(row) {
  if (row.tvl_usd >= 1e9) return 250;
  if (row.tvl_usd >= 5e8) return 150;
  if (row.tvl_usd >= 1e8) return 100;
  return 50;
}
function holdDaysFor(row) {
  const age = row.age_days;
  if (age === null || age === undefined) return 45;
  if (age < 180) return 30;
  if (age < 365) return 45;
  return 60;
}

const state = {
  tab: 'pre', q: '', category: '', chain: '', mintvl: 0,
  sort: 'implied', watchlistOnly: false, shown: PAGE_SIZE,
};

function allRows() {
  return state.tab === 'live' ? RADAR.live_rows : RADAR.rows;
}

function filteredRows() {
  const q = state.q.trim().toLowerCase();
  let rows = allRows().filter((row) => {
    if (state.watchlistOnly && !row.watchlist) return false;
    if (state.mintvl && row.tvl_usd < state.mintvl) return false;
    if (state.category && row.category !== state.category) return false;
    if (state.chain && !(row.chains || []).includes(state.chain)) return false;
    if (q) {
      const hay = [row.name, row.category || '', (row.chains || []).join(' ')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const key = state.sort;
  const byImplied = (a, b) => (b.implied_value_usd ?? b.mcap_usd) - (a.implied_value_usd ?? a.mcap_usd);
  if (key === 'implied') rows = rows.slice().sort(byImplied);
  else if (key === 'tvl') rows = rows.slice().sort((a, b) => b.tvl_usd - a.tvl_usd);
  else if (key === 'growth') rows = rows.slice().sort((a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9));
  else if (key === 'age') rows = rows.slice().sort((a, b) => (b.age_days ?? -1) - (a.age_days ?? -1));
  else if (key === 'name') rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  else if (key === 'rank') rows = rows.slice().sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
  return rows;
}

function valueCell(row) {
  const value = state.tab === 'live' ? row.mcap_usd : row.implied_value_usd;
  const max = state.tab === 'live'
    ? Math.max(...RADAR.live_rows.map((r) => r.mcap_usd))
    : RADAR.rows[0].implied_value_usd;
  const width = Math.max(2, Math.round((value / max) * 100));
  return `<span class="bar-wrap"><span class="bar"><i style="width:${width}%"></i></span><b>${fmtMoney(value)}</b></span>`;
}

function renderRows() {
  const rows = filteredRows();
  const shown = rows.slice(0, state.shown);
  const body = $('rows');
  body.innerHTML = shown.map((row) => {
    const live = state.tab === 'live';
    const rank = live ? '—' : row.rank;
    const pill = live
      ? '<span class="pill live"><i></i>live token</span>'
      : '<span class="pill"><i></i>no token</span>';
    const watch = row.watchlist ? ' <span class="watch">· watchlist</span>' : '';
    const growth = row.change_7d === null
      ? '<span>—</span>'
      : `<span class="${row.change_7d >= 0 ? 'up' : 'down'}">${fmtPct(row.change_7d)}</span>`;
    return `<tr data-slug="${esc(row.slug)}">
      <td class="num">${rank}</td>
      <td><div class="name">${esc(row.name)}</div>
        <div class="sub">${esc(row.category || '—')} on ${esc(fmtChains(row.chains))}${watch}</div></td>
      <td class="num">${fmtMoney(row.tvl_usd)}</td>
      <td class="num">${growth}</td>
      <td class="num">${fmtAge(row.age_days)}</td>
      <td class="num">${valueCell(row)}</td>
      <td>${pill}</td></tr>`;
  }).join('');
  $('count').textContent = `Showing ${shown.length} of ${rows.length} rows`;
  $('table-note').textContent = state.tab === 'live'
    ? 'Protocols whose token already trades, largest market cap first. They are not ranked against the pre-token board.'
    : 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.';
  const more = $('more');
  more.disabled = rows.length <= state.shown;
  more.textContent = rows.length <= state.shown
    ? 'End of the board'
    : `Show more (${rows.length - state.shown} left)`;
  document.querySelectorAll('#board thead th')[5].textContent =
    state.tab === 'live' ? 'Market cap' : 'Implied value';
}

function renderFacts() {
  const total = RADAR.rows.reduce((s, r) => s + r.implied_value_usd, 0);
  $('facts').innerHTML = `
    <div><dt>Watchlist covered</dt><dd>${RADAR.watchlist_covered} / ${RADAR.watchlist_size}</dd></div>
    <div><dt>Pre-token rows scored</dt><dd>${RADAR.rows.length}</dd></div>
    <div><dt>Early rows below the floor</dt><dd>${RADAR.rows.length - RADAR.watchlist_size}</dd></div>
    <div><dt>Live-token protocols set aside</dt><dd>${RADAR.live_rows.length}</dd></div>`;
  $('headline').textContent =
    `${RADAR.watchlist_size} watchlist protocols, ranked by implied value`;
  $('intro').textContent =
    `The watchlist is the floor: every protocol with at least ${fmtMoney(RADAR.floor_usd)} of TVL and no token on record. The early radar adds ${RADAR.rows.length - RADAR.watchlist_size} pre-token protocols below that floor, every one the rule admits. Implied value is a model, not a promise.`;
  $('chart-note').textContent = `Total implied value on the board: ${fmtMoney(total)}`;
  // The snapshot's source field carries the full fetch URL and timestamp; the page
  // shows the short name, and the footer names the source the same way.
  $('meta').textContent =
    `Snapshot ${RADAR.as_of} · DefiLlama protocol index · ${RADAR.model_version} model`;
  $('foot').textContent =
    `Token Radar · ${RADAR.model_version} model · snapshot ${RADAR.as_of} from the DefiLlama protocol index · ` +
    `Implied value is a model built only from this snapshot, not a price and not a prediction. ` +
    `Farm at your own risk: never pay to claim an airdrop.`;
}

function renderChart() {
  const top = RADAR.rows.slice(0, 10);
  const max = top[0].implied_value_usd;
  $('chart').innerHTML = top.map((row) => {
    const width = Math.max(2, Math.round((row.implied_value_usd / max) * 100));
    return `<div class="chart-row"><span class="rk">${row.rank}</span>
      <span class="nm">${esc(row.name)} <small>· ${esc(row.category || '')}</small></span>
      <span class="val">${fmtMoney(row.implied_value_usd)}</span>
      <span class="bar"><i style="width:${width}%"></i></span></div>`;
  }).join('');
}

function renderMultiples() {
  const counts = {};
  for (const row of RADAR.rows) counts[row.category] = (counts[row.category] || 0) + 1;
  const entries = Object.keys(counts)
    .map((cat) => ({ cat, mult: CATEGORY_MULTIPLE[cat] ?? DEFAULT_MULTIPLE, n: counts[cat] }))
    .sort((a, b) => b.mult - a.mult || a.cat.localeCompare(b.cat));
  $('multiples').innerHTML =
    '<tr><th>Category</th><th>Multiple</th><th>Rows</th></tr>' +
    entries.map((e) => `<tr><td>${esc(e.cat)}</td><td>${e.mult.toFixed(2)}</td><td>${e.n}</td></tr>`).join('') +
    `<tr><td>Any other category</td><td>${DEFAULT_MULTIPLE.toFixed(2)}</td><td>—</td></tr>`;
}

function renderOptions() {
  const cats = [...new Set(RADAR.rows.map((r) => r.category).filter(Boolean))].sort();
  $('category').innerHTML = '<option value="">All categories</option>' +
    cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const chains = [...new Set(RADAR.rows.flatMap((r) => r.chains || []))].sort();
  $('chain').innerHTML = '<option value="">All chains</option>' +
    chains.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function whyThisRank(row) {
  const tvlRank = RADAR.rows.filter((r) => r.tvl_usd > row.tvl_usd).length + 1;
  const cm = row.category_multiple ?? (CATEGORY_MULTIPLE[row.category] ?? DEFAULT_MULTIPLE);
  const growth = row.change_7d === null ? 'no 7-day change recorded' :
    `7-day growth of ${fmtPct(row.change_7d)}`;
  return `It ranks <b>#${row.rank}</b> because its <b>${fmtMoney(row.tvl_usd)} of TVL</b> is ` +
    `#${tvlRank} on the board, its ${esc(row.category || 'category')} multiple is ` +
    `<b>${cm.toFixed(2)}</b>, it has ${growth}, and it has run ` +
    `<b>${fmtAge(row.age_days)}</b> with no token on record.`;
}

function openDetail(slug) {
  const row = RADAR.rows.find((r) => r.slug === slug) || RADAR.live_rows.find((r) => r.slug === slug);
  if (!row) return;
  const live = !row.implied_value_usd;
  const recomputed = live ? null : impliedOf(row);
  const capital = capitalFor(row);
  const hold = holdDaysFor(row);
  const costs = [
    { cost: 'No fee to set up.', time: '5 minutes.' },
    { cost: `$${capital} of capital and about $8 of gas.`, time: '15 minutes to set up.' },
    { cost: 'About $2 of gas a week.', time: '10 minutes a week.' },
    { cost: `The $${capital} stays in the position.`, time: `${hold} days.` },
    { cost: 'No fee to check, and never pay to claim.', time: '10 minutes.' },
    { cost: 'No fee.', time: '2 minutes after each action.' },
  ];
  const modelHtml = live ? `
    <h3>Token</h3>
    <dl class="kv">
      <dt>Market cap</dt><dd><b>${fmtMoney(row.mcap_usd)}</b></dd>
      <dt>TVL</dt><dd>${fmtMoney(row.tvl_usd)}</dd>
      <dt>Age with a token</dt><dd>${fmtAge(row.age_days)}</dd>
    </dl>
    <p class="why">This protocol already has a token, so it is not ranked. It is shown here so the board's pre-token rows can be checked against it.</p>`
  : `
    <h3>Implied value</h3>
    <dl class="kv">
      <dt>TVL</dt><dd>${fmtMoney(row.tvl_usd)}</dd>
      <dt>Seven-day growth</dt><dd>${fmtPct(row.change_7d)}</dd>
      <dt>Age with no token</dt><dd>${fmtAge(row.age_days)}</dd>
      <dt>Implied value</dt><dd><b>${fmtMoney(row.implied_value_usd)}</b></dd>
    </dl>
    <div class="factors">
      <div class="f"><span>TVL × category multiple (${esc(row.category || '—')} × ${(row.category_multiple ?? DEFAULT_MULTIPLE).toFixed(2)})</span><b>${fmtMoney(row.tvl_usd * (row.category_multiple ?? DEFAULT_MULTIPLE))}</b></div>
      <div class="f"><span>Growth multiplier</span><b>${(row.growth_multiplier ?? 1).toFixed(3)}</b></div>
      <div class="f"><span>Maturity multiplier</span><b>${(row.maturity_multiplier ?? 1).toFixed(3)}</b></div>
      <div class="f"><span>Chain multiplier (${(row.chains || []).length} chain${(row.chains || []).length === 1 ? '' : 's'})</span><b>${(row.chain_multiplier ?? 1).toFixed(2)}</b></div>
    </div>
    <p class="why">The page recomputes this row as <b>${fmtMoney(recomputed)}</b>, the same number board.json carries${recomputed === row.implied_value_usd ? '' : ' — the two disagree, so this row is wrong'}. This is an estimate, not a price.</p>
    <p class="why">${whyThisRank(row)}</p>
    <h3>Farm plan</h3>
    <ol class="farm">${(row.farm_steps || []).map((step, i) => `<li><div>${esc(step)}<div class="cost">Cost: ${costs[i] ? costs[i].cost : ''} Time: ${costs[i] ? costs[i].time : ''}</div></div></li>`).join('')}</ol>`;
  $('detail-body').innerHTML = `
    <p class="hint">${live ? 'Live token' : `Rank ${row.rank} of ${RADAR.rows.length}`}${row.watchlist ? ' · watchlist' : ''}</p>
    <h2>${esc(row.name)}</h2>
    <p class="sub">${esc(row.category || '—')} on ${esc((row.chains || []).join(', '))}</p>
    ${modelHtml}`;
  $('detail').hidden = false;
  setHash();
}

function closeDetail() {
  $('detail').hidden = true;
  setHash();
}

function setHash() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.chain) params.set('chain', state.chain);
  if (!$('detail').hidden) {
    const name = document.querySelector('#detail-body h2');
    const row = RADAR.rows.find((r) => r.name === (name ? name.textContent : '')) ||
      RADAR.live_rows.find((r) => r.name === (name ? name.textContent : ''));
    if (row) params.set('p', row.slug);
  }
  const hash = params.toString();
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname);
}

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get('q')) { state.q = params.get('q'); $('q').value = state.q; }
  if (params.get('category')) { state.category = params.get('category'); $('category').value = state.category; }
  if (params.get('chain')) { state.chain = params.get('chain'); $('chain').value = state.chain; }
  return params.get('p');
}

function bind() {
  $('q').addEventListener('input', () => { state.q = $('q').value; state.shown = PAGE_SIZE; renderRows(); setHash(); });
  $('category').addEventListener('change', () => { state.category = $('category').value; state.shown = PAGE_SIZE; renderRows(); setHash(); });
  $('chain').addEventListener('change', () => { state.chain = $('chain').value; state.shown = PAGE_SIZE; renderRows(); setHash(); });
  $('mintvl').addEventListener('change', () => { state.mintvl = Number($('mintvl').value); state.shown = PAGE_SIZE; renderRows(); });
  $('sort').addEventListener('change', () => { state.sort = $('sort').value; renderRows(); });
  $('watchlist-only').addEventListener('change', () => { state.watchlistOnly = $('watchlist-only').checked; state.shown = PAGE_SIZE; renderRows(); });
  $('more').addEventListener('click', () => { state.shown += PAGE_SIZE; renderRows(); });
  $('close').addEventListener('click', closeDetail);
  $('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.dataset.slug);
  });
  document.querySelectorAll('#board thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      state.sort = key === 'rank' ? 'rank' : key === 'name' ? 'name' : key === 'tvl' ? 'tvl' :
        key === 'growth' ? 'growth' : key === 'age' ? 'age' : 'implied';
      $('sort').value = state.sort;
      renderRows();
    });
  });
  const setTab = (tab) => {
    state.tab = tab; state.shown = PAGE_SIZE;
    $('tab-pre').setAttribute('aria-selected', String(tab === 'pre'));
    $('tab-live').setAttribute('aria-selected', String(tab === 'live'));
    renderRows();
  };
  $('tab-pre').addEventListener('click', () => setTab('pre'));
  $('tab-live').addEventListener('click', () => setTab('live'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
}

renderFacts();
renderChart();
renderOptions();
renderMultiples();
const openSlug = readHash();
renderRows();
bind();
if (openSlug) openDetail(openSlug);
