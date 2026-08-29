# LLM Eval Scorecard

A single-file web app for side-by-side human eval of two model responses to the same
prompt. Score on a weighted rubric, watch the aggregate verdict build across a session,
export the run as CSV.

No build step, no dependencies, no backend — open `index.html`.

```bash
cd ~/llm-eval-scorecard && python3 -m http.server 4790
```

Then visit http://localhost:4790. State persists in `localStorage`; **Load demo session**
seeds 8 realistic support-quality evals if you want something to show immediately.

## What it does

- **Trial**: one shared prompt, two response panes, 1–5 scoring on Helpfulness / Accuracy / Tone
- **Blind scoring** (on by default): panes read "Response 1 / Response 2" until saved
- **Randomized pane order**: which model sits on the left is coin-flipped *every trial*
- **Weighted rubric**: editable weights, normalized; changing them re-scores the whole session
- **Aggregate**: per-model means, win rate, leader + margin, left-pane win rate
- **Chart**: grouped bars per criterion + weighted composite, hover for exact values
- **CSV export**: raw per-criterion scores, weights, composites, winner, pane position, notes
- **Eval log**: full session table, delete any row to re-run the aggregate

And, because "which model won" is not a finding until you know it would happen again:

- **Bootstrap 95% CI** on the paired score gap, with an interval strip showing where it
  sits relative to zero — the verdict tile reads *Lead holds up* only when the whole
  interval clears zero
- **Exact binomial test** on the decided trials, and a second one on the left-pane win
  rate, replacing the old "flag it at 75%" heuristic with a p-value
- **Sample-size readout**: how many decided trials the observed effect actually needs,
  and the smallest win rate your current n could detect
- **Inter-rater reliability**: Krippendorff's α (ordinal) overall and per criterion,
  quadratic-weighted Cohen's κ when there are exactly two raters, and a per-criterion
  table that points at the rubric line doing the worst
- **Rater IDs and CSV import**: export from one browser, import into another, and the
  two sessions become one multi-rater study — no backend, no accounts

## The six design decisions worth defending

These are the parts that separate a scorecard from a spreadsheet.

**1. Pane order is randomized per trial, and left-pane win rate is a first-class metric.**
Side-by-side human eval has a well-known position bias — raters favor whichever response
they read first. If Model A always sits on the left, that bias is baked silently into your
result. Randomizing per trial converts it into something measurable: if the left pane wins
~50% of decided trials, position isn't driving the outcome; if it's 75% at n≥8, the app
flags it. The metric only means something *because* of the randomization — the two features
are one decision.

**2. Raw 1–5 scores are the source of truth; composites are derived.**
Weights are a modeling choice you should be able to revise after seeing the data — "actually,
for this surface, accuracy should outweigh tone 3:1." Because only raw scores are stored,
changing a weight retroactively re-scores every saved eval instead of stranding old rows
under an old rubric. You can't do that if you store the composite.

**3. Ties are counted, not broken.**
Win rate excludes ties from the position-bias denominator and reports them separately. A
rubric that produces a lot of ties is telling you the criteria don't discriminate on this
prompt set — that's a signal about the rubric, and burying it in a forced binary loses it.

**4. The interval, not the point estimate, is the headline.**
A 0.4-point lead across 8 trials and a 0.4-point lead across 400 are different claims, and
a mean alone cannot tell them apart. The bootstrap resamples the *paired* per-trial gap —
paired because both models answered the same prompt, so prompt-to-prompt difficulty is
shared variance and shouldn't be charged against the comparison. The verdict tile refuses
to say a model is ahead while the interval still contains zero, no matter how the bar chart
looks. The resampler is seeded, so the same session always yields the same interval: two
people reading one scorecard should argue about the model, not about the seed.

**5. Reliability is measured before quality, and the CSV is the protocol.**
A single-rater scorecard cannot separate a real quality gap from one person's drift, so the
app now carries a rater ID and computes agreement on the prompts two raters both covered.
Krippendorff's α is the primary number — ordinal, because a 4-vs-5 disagreement is not the
same failure as 1-vs-5, and tolerant of missing data, because real annotation sets are
ragged and raters skip things. Weighted κ sits beside it because that's the dialect most
annotation vendors quote. The mechanism is deliberately the CSV the app already exported:
making the export format the import format turns a file you download into the interchange
protocol for a multi-rater study, and keeps the whole thing backend-free. Re-importing a
corrected file replaces that rater's rows rather than double-counting them.

**6. Position bias gets a test, not a threshold.**
The first version flagged position bias at "≥75% left-pane wins with n≥8" — a threshold with
no error rate attached, which fires on noise at small n and stays silent on real bias at
large n. It's now a two-sided exact binomial test against 0.5. Exact rather than
normal-approximate because eval sessions are small, and n=12 is roughly where the normal
approximation starts to lie.

Honest limitations to name before someone else does: the 1–5 scale still has no anchored
descriptors, so it drifts across a long session; α is computed on whatever prompts happen to
overlap rather than a designed calibration set; the sample-size numbers are a normal
approximation and are labelled as such in the UI; and all of this measures preference, not
ground truth.

## Verifying the math

The statistics are hand-rolled to keep the app dependency-free, which means they need
checking against implementations that are already trusted. `binomTest`, `weightedKappa`,
`krippendorffOrdinal`, and the power calculations were validated against SciPy's
`binomtest`, scikit-learn's `cohen_kappa_score(weights="quadratic")`, and the `krippendorff`
package across randomized cases including ragged units and degenerate perfect-agreement
inputs — agreement to 1e-8 or better. The bootstrap is checked for a reproducible interval
and an exact point estimate.

## Follow-up ideas

If you keep iterating: anchored scale descriptors on hover, a designed calibration subset
rather than incidental overlap, per-prompt-category breakdown, BCa instead of percentile
bootstrap intervals, and a disagreement queue that routes low-α cells back for adjudication.

## Building this in Replit (for the onboarding experience)

Building it once here gets you the artifact. Building it again in Replit gets you the
first-hand product experience — how the agent scopes an ambiguous prompt, what it asks
versus assumes, how it handles a mid-build correction. That's the part worth doing yourself.
Use these three prompts in sequence and pay attention to the *loop*, not just the output:

**Prompt 1 — first generation**
> Build a web app where I can paste two AI responses to the same prompt, score them
> side-by-side on a rubric (helpfulness, accuracy, tone) on a 1–5 scale, and see aggregate
> scores across a session. Keep the session in browser storage — no login, no backend.

**Prompt 2 — first iteration**
> Add a grouped bar chart showing each model's mean score per rubric criterion, plus a
> weighted overall score where I can edit the weights. Changing a weight should re-score
> the evals I've already saved.

**Prompt 3 — second iteration**
> Add CSV export of the full session — one row per eval with the raw per-criterion scores,
> the weights used, and the winner. Also randomize which response appears on the left each
> trial and show me the left-pane win rate, so I can tell whether position bias is affecting
> my scoring.

Things worth noticing while you do it, because they're screen material: whether the agent
asks a clarifying question before writing code or just picks defaults; whether prompt 2's
"re-score what I already saved" makes it refactor its data model or patch around it; whether
prompt 3's position-bias request lands as one coherent feature or two disconnected ones; and
what the recovery loop feels like when something breaks.
