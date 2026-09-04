# LLM Eval Scorecard

**An eval result nobody can audit is an opinion with a bar chart attached.**

Side-by-side human eval decides which model ships, and most of it runs in a spreadsheet that records the verdict but not the conditions: no randomization, no interval, no agreement number, no way for a second person to reproduce the run. This scores two responses to one prompt on a weighted rubric and refuses to call a winner it cannot defend.

▶ **[Live demo](https://chloe4ai.github.io/llm-eval-scorecard/)** — hit **Load demo session** for a seeded two-rater run

---

## The product argument

**1. Pane order is randomized per trial, and position bias gets a test, not a threshold.**
Raters favor whichever response they read first, so if Model A always sits on the left that bias is baked silently into the result. Randomizing per trial makes it measurable, and left-pane win rate a first-class metric. The first version flagged bias at "≥75% left-pane wins with n≥8" — a threshold with no error rate attached, which fires on noise at small n and stays quiet on real bias at large n. It is now a two-sided exact binomial test against 0.5, exact because n=12 is where the normal approximation starts to lie.

**2. Raw 1–5 scores are the source of truth; composites are derived.**
Weights (Helpfulness 0.4, Accuracy 0.4, Tone 0.2, normalized) are a modeling choice you should be able to revise after seeing the data. Because only raw scores are stored, changing one re-scores every saved eval instead of stranding old rows under an old rubric. You cannot do that if you store the composite. Ties are counted rather than broken, and kept out of the position-bias denominator: a rubric producing many of them is saying its criteria do not discriminate here.

**3. The interval, not the point estimate, is the headline.**
A 0.4-point lead across 8 trials and across 400 are different claims; a mean cannot tell them apart. The app runs 2,000 paired resamples on the per-trial gap — paired because both models answered the same prompt, so prompt difficulty is shared variance and should not be charged to the comparison — and draws the 95% interval on a strip against zero. The verdict tile reads *Lead holds up* only when the whole interval clears zero, whatever the bars look like. The PRNG is seeded, so two people reading one scorecard argue about the model, not the seed.

**4. Reliability is measured before quality, and the CSV is the protocol.**
One rater cannot separate a real quality gap from their own drift, so every eval carries a rater ID and agreement is computed on the prompts two raters both covered. Krippendorff's α is primary — ordinal, because 4-vs-5 is not the same failure as 1-vs-5, and tolerant of missing data, because annotation sets are ragged; weighted κ sits beside it at two raters, the dialect vendors quote. Bands are on the tile: α ≥ .80 publishable, ≥ .667 tentative. The transport is the CSV the app already exports: export format as import format makes a download the study protocol — no backend, no accounts.

---

## What's in it

| Surface | What it does |
|---|---|
| **Trial** | One prompt, two panes, 1–5 on Helpfulness / Accuracy / Tone. Blind by default, pane order coin-flipped each trial |
| **Aggregate** | Per-model means, win rate, leader and margin, left-pane rate, grouped bars per criterion and composite |
| **Confidence** | Bootstrap CI on the paired gap, exact binomial on win rate and pane position, trials needed at the observed rate, smallest rate this n detects |
| **Reliability** | α overall and per criterion, weighted κ at two raters, double-scored cell count, a pointer at the worst rubric line |
| **Data** | CSV export/import of raw scores, weights, winner, pane position, rater and notes; eval log with per-row delete |

## Verifying the math

The statistics are hand-rolled, so `test/test_stats.js` pulls the `STAT` module straight out of `index.html` — never a copy that can drift — and `ref_stats.py` checks it to 1e-8 against SciPy, scikit-learn and the `krippendorff` package, ragged units and small-n binomials included.

## Run it

No build step, no dependencies, no backend. State lives in `localStorage`.

```bash
python3 -m http.server 4790                                  # then open localhost:4790
cd test && pip install scipy scikit-learn krippendorff && python3 ref_stats.py
```

## Known limits

- **The 1–5 scale has no anchored descriptors**, so it drifts across a long session. What would catch it: re-score the session's first prompts at the end and report within-rater α — below .80 means the scale moved, not the models.
- **α is computed on incidental overlap**, not a designed calibration set, so it describes whatever prompts two raters happened to share.
- **The sample-size figures are a normal approximation** (two-sided α=.05, 80% power) and labelled as such; the tests themselves are exact. Simulating them against the exact test at n<30 would say how far off they run.
- **This measures preference, not ground truth.** Nothing has a reference answer, so a session can be reliable, agreed-upon, and still measuring a shared bias.

## What I'd build next

- **A calibration subset and a disagreement queue** routing low-α cells back for adjudication, measuring whether α recovers afterward instead of assuming it does.
- **BCa rather than percentile intervals**, measured by coverage against simulated paired gaps at n = 8 to 40 — percentile intervals undercover on skewed gaps, which is the regime this app lives in.
- **Per-prompt-category breakdown**, measuring whether a lead is uniform or lives in one slice — an overall win that is really one category's is the commonest way an eval misleads.

---

<sub>Built twice on purpose: once here, once in Replit from three prompts, to watch how an agent handles a mid-build data-model change — "changing a weight should re-score the evals I already saved."</sub>
