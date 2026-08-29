// Pulls the STAT module straight out of the shipped index.html and evaluates it,
// so the tests exercise the code the app actually runs rather than a copy that can
// drift. Driven by ref_stats.py, which compares the results against SciPy,
// scikit-learn and the krippendorff package.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const STAT = (() => {');
const end = html.indexOf('// ---------- rater bookkeeping ----------');
if (start < 0 || end < 0 || end < start) {
  console.error('could not locate the STAT module in index.html');
  process.exit(2);
}
const STAT = new Function(html.slice(start, end) + '\n return STAT;')();

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const out = {};

out.binom = cases.binom.map(([k, n]) => STAT.binomTest(k, n, 0.5));
out.kappa = cases.kappa.map(pairs => STAT.weightedKappa(pairs, 1, 5));
out.alpha = cases.alpha.map(units => STAT.krippendorffOrdinal(units));
out.nfor = cases.nfor.map(p => STAT.nForWinRate(p));
out.mde = cases.mde.map(n => STAT.mdeWinRate(n));

const ev = cases.boot.map(([wa, wb]) => ({ wa, wb }));
const b1 = STAT.bootstrapGap(ev), b2 = STAT.bootstrapGap(ev);
out.boot = {
  point: b1.point, lo: b1.lo, hi: b1.hi,
  deterministic: b1.lo === b2.lo && b1.hi === b2.hi,
  ordered: b1.lo <= b1.point && b1.point <= b1.hi,
};

console.log(JSON.stringify(out));
