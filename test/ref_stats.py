import json, subprocess, math, random, os
import numpy as np
from scipy.stats import binomtest
from sklearn.metrics import cohen_kappa_score
import krippendorff

here = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(7)

binom_cases = [[7, 10], [0, 5], [12, 12], [50, 100], [31, 40], [3, 17], [1, 1], [9, 20]]

kappa_cases = []
for _ in range(6):
    n = rng.randint(12, 60)
    pairs = []
    for _ in range(n):
        a = rng.randint(1, 5)
        b = max(1, min(5, a + rng.choice([-2, -1, 0, 0, 0, 1, 2])))
        pairs.append([a, b])
    kappa_cases.append(pairs)
# a degenerate-ish case: perfect agreement
kappa_cases.append([[i, i] for i in [1, 2, 3, 4, 5] * 4])

alpha_cases = []
for _ in range(6):
    n = rng.randint(10, 40)
    units = []
    for _ in range(n):
        base = rng.randint(1, 5)
        m = rng.choice([2, 2, 2, 3])
        u = [max(1, min(5, base + rng.choice([-1, 0, 0, 1]))) for _ in range(m)]
        units.append(u)
    # ragged: some single-rater units that must be ignored
    units += [[rng.randint(1, 5)] for _ in range(rng.randint(0, 5))]
    alpha_cases.append(units)

nfor_cases = [0.75, 0.6, 0.55, 0.9, 0.65]
mde_cases = [8, 20, 50, 100, 400]
boot_cases = [[round(rng.uniform(2, 5), 3), round(rng.uniform(2, 5), 3)] for _ in range(30)]

cases = dict(binom=binom_cases, kappa=kappa_cases, alpha=alpha_cases,
             nfor=nfor_cases, mde=mde_cases, boot=boot_cases)
json.dump(cases, open(here + '/cases.json', 'w'))

js = json.loads(subprocess.check_output(['node', here + '/test_stats.js']).decode())

def cmp(name, ours, ref, tol=1e-8):
    bad = []
    for i, (o, r) in enumerate(zip(ours, ref)):
        if r is None:
            continue
        if not (math.isfinite(o) and math.isfinite(r)):
            if math.isfinite(o) != math.isfinite(r):
                bad.append((i, o, r))
            continue
        if abs(o - r) > tol * max(1.0, abs(r)):
            bad.append((i, o, r))
    print(f"{name:<28} {len(ours)-len(bad)}/{len(ours)} match" + ("" if not bad else f"   MISMATCH {bad}"))
    return not bad

ok = True
ok &= cmp("binomTest vs scipy", js['binom'],
          [binomtest(k, n, 0.5).pvalue for k, n in binom_cases], 1e-9)

ref_kappa = []
for pairs in kappa_cases:
    a = [p[0] for p in pairs]; b = [p[1] for p in pairs]
    ref_kappa.append(cohen_kappa_score(a, b, weights='quadratic', labels=[1, 2, 3, 4, 5]))
ok &= cmp("weightedKappa vs sklearn", js['kappa'], ref_kappa, 1e-9)

ref_alpha = []
for units in alpha_cases:
    used = [u for u in units if len(u) >= 2]
    width = max(len(u) for u in used)
    # krippendorff pkg wants raters x units; pad with nan
    mat = np.full((width, len(used)), np.nan)
    for j, u in enumerate(used):
        for i, v in enumerate(u):
            mat[i, j] = v
    ref_alpha.append(krippendorff.alpha(reliability_data=mat, level_of_measurement='ordinal'))
ok &= cmp("krippendorffOrdinal vs pkg", js['alpha'], ref_alpha, 1e-8)

# power / sample size against an independent normal-approx computation
from scipy.stats import norm
ref_n = [math.ceil(((norm.ppf(0.975) * 0.5 + norm.ppf(0.8) * math.sqrt(p * (1 - p))) / (p - 0.5)) ** 2)
         for p in nfor_cases]
ok &= cmp("nForWinRate", js['nfor'], ref_n, 1e-12)

ref_mde = []
for n in mde_cases:
    p = 0.75
    for _ in range(200):
        p = 0.5 + (norm.ppf(0.975) * 0.5 + norm.ppf(0.8) * math.sqrt(p * (1 - p))) / math.sqrt(n)
        if p >= 0.999:
            p = 0.999
            break
    ref_mde.append(p)
ok &= cmp("mdeWinRate", js['mde'], ref_mde, 1e-6)

d = [a - b for a, b in boot_cases]
print(f"{'bootstrap point estimate':<28} ours={js['boot']['point']:.9f} ref={np.mean(d):.9f}")
ok &= abs(js['boot']['point'] - float(np.mean(d))) < 1e-9
print(f"{'bootstrap deterministic':<28} {js['boot']['deterministic']}")
print(f"{'bootstrap lo<=point<=hi':<28} {js['boot']['ordered']}  [{js['boot']['lo']:.3f}, {js['boot']['hi']:.3f}]")
ok &= js['boot']['deterministic'] and js['boot']['ordered']

print()
print("ALL CHECKS PASS" if ok else "*** FAILURES ***")
