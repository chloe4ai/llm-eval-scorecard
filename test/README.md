# Statistics tests

The app ships with no dependencies, so the statistics are hand-rolled — which means they
have to be checked against implementations that are already trusted.

`test_stats.js` extracts the `STAT` module directly out of `../index.html` (not a copy) and
runs it over randomized cases. `ref_stats.py` generates those cases, computes the same
quantities with SciPy / scikit-learn / the `krippendorff` package, and compares.

```bash
pip install scipy scikit-learn krippendorff
python3 ref_stats.py
```

Expected output:

```
binomTest vs scipy           8/8 match
weightedKappa vs sklearn     7/7 match
krippendorffOrdinal vs pkg   6/6 match
nForWinRate                  5/5 match
mdeWinRate                   5/5 match
bootstrap point estimate     ours=... ref=...
bootstrap deterministic      True
bootstrap lo<=point<=hi      True
ALL CHECKS PASS
```

The cases are regenerated on each run from a fixed seed and include ragged units (raters who
skipped prompts), degenerate perfect agreement, and small-n binomials where the normal
approximation would disagree with the exact test.
