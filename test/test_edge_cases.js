// Edge-case tests for the STAT module. These need nothing but Node (>=18):
//   node --test test/
// Unlike ref_stats.py, which checks the happy path against SciPy, these pin down
// what happens with the messy input a real annotation session produces: skipped
// cells, half-filled CSV rows, out-of-range scores.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const STAT = (() => {');
const end = html.indexOf('// ---------- rater bookkeeping ----------');
assert.ok(start >= 0 && end > start, 'could not locate the STAT module in index.html');
const STAT = new Function(html.slice(start, end) + '\n return STAT;')();

const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('binomTest: textbook values', () => {
  close(STAT.binomTest(5, 10), 1);
  close(STAT.binomTest(0, 5), 0.0625);           // 2 * 0.5^5
  close(STAT.binomTest(10, 10), 2 / 1024);
});

test('binomTest: rejects non-integer counts and degenerate p', () => {
  assert.ok(Number.isNaN(STAT.binomTest(2.5, 5)));
  assert.ok(Number.isNaN(STAT.binomTest(3, 5, 0)));
  assert.ok(Number.isNaN(STAT.binomTest(3, 5, 1)));
  assert.ok(Number.isNaN(STAT.binomTest(6, 5)));
  assert.ok(Number.isNaN(STAT.binomTest(0, 0)));
});

test('bootstrapGap: needs two evals', () => {
  assert.equal(STAT.bootstrapGap([]), null);
  assert.equal(STAT.bootstrapGap([{ wa: 4, wb: 3 }]), null);
});

test('bootstrapGap: a NaN score is dropped, not propagated', () => {
  const clean = [{ wa: 3, wb: 2 }, { wa: 4, wb: 4 }];
  const dirty = [{ wa: 3, wb: 2 }, { wa: NaN, wb: 1 }, { wa: 4, wb: 4 }];
  const a = STAT.bootstrapGap(clean), b = STAT.bootstrapGap(dirty);
  assert.ok(Number.isFinite(b.point) && Number.isFinite(b.lo) && Number.isFinite(b.hi));
  close(b.point, a.point);
  assert.equal(b.crossesZero, true);
});

test('bootstrapGap: identical models give a zero-width interval on zero', () => {
  const r = STAT.bootstrapGap(Array.from({ length: 10 }, () => ({ wa: 3.2, wb: 3.2 })));
  assert.equal(r.lo, 0); assert.equal(r.hi, 0); assert.equal(r.crossesZero, true);
});

test('bootstrapGap: a clear winner does not cross zero', () => {
  const r = STAT.bootstrapGap(Array.from({ length: 20 }, (_, i) => ({ wa: 4 + (i % 3) * 0.1, wb: 2 })));
  assert.equal(r.crossesZero, false);
  assert.ok(r.lo > 0);
});

test('krippendorffOrdinal: perfect agreement is 1', () => {
  close(STAT.krippendorffOrdinal([[1, 1], [2, 2], [3, 3], [5, 5, 5]]), 1);
});

test('krippendorffOrdinal: no double-scored units is NaN', () => {
  assert.ok(Number.isNaN(STAT.krippendorffOrdinal([[3], [4], [5]])));
  assert.ok(Number.isNaN(STAT.krippendorffOrdinal([])));
});

test('krippendorffOrdinal: skipped (null/NaN) cells are ignored, not scored as 0', () => {
  const base = [[2, 2], [3, 3], [4, 5]];
  const expected = STAT.krippendorffOrdinal(base);
  close(STAT.krippendorffOrdinal([[1, null], ...base]), expected);
  close(STAT.krippendorffOrdinal([[NaN, 4], ...base]), expected);
});

test('weightedKappa: perfect agreement is 1, empty is NaN', () => {
  close(STAT.weightedKappa([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]), 1);
  assert.ok(Number.isNaN(STAT.weightedKappa([])));
});

test('weightedKappa: out-of-range pairs do not dilute the result', () => {
  const valid = [[1, 2], [2, 2], [3, 4], [4, 4], [5, 5]];
  close(STAT.weightedKappa([...valid, [9, 1], [0, 3]]), STAT.weightedKappa(valid));
});

test('weightedKappa: non-integer scores are skipped instead of throwing', () => {
  const valid = [[1, 1], [5, 5], [2, 3]];
  close(STAT.weightedKappa([[3.5, 3], ...valid]), STAT.weightedKappa(valid));
});

test('nForWinRate: shape of the curve', () => {
  assert.equal(STAT.nForWinRate(0.5), Infinity);
  assert.ok(STAT.nForWinRate(0.6) > STAT.nForWinRate(0.75));
  assert.equal(STAT.nForWinRate(0.75), STAT.nForWinRate(0.25)); // symmetric
});

test('nForWinRate: rates outside [0, 1] are NaN, not a bogus sample size', () => {
  assert.ok(Number.isNaN(STAT.nForWinRate(1.2)));
  assert.ok(Number.isNaN(STAT.nForWinRate(-0.1)));
  assert.ok(Number.isNaN(STAT.nForWinRate(NaN)));
});

test('mdeWinRate: shrinks with n and stays in (0.5, 0.999]', () => {
  assert.ok(Number.isNaN(STAT.mdeWinRate(1)));
  let prev = 1;
  for (const n of [8, 20, 50, 100, 400]) {
    const m = STAT.mdeWinRate(n);
    assert.ok(m > 0.5 && m <= 0.999 && m < prev, `n=${n} -> ${m}`);
    prev = m;
  }
});

test('alphaBand thresholds', () => {
  assert.equal(STAT.alphaBand(0.8), 'publishable');
  assert.equal(STAT.alphaBand(0.7), 'tentative only');
  assert.equal(STAT.alphaBand(0.5), 'not reliable');
  assert.equal(STAT.alphaBand(NaN), '-');
});
