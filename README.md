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

## The three design decisions worth defending

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

Honest limitations to name before someone else does: n=1 rater, so there's no inter-rater
agreement; the 1–5 scale has no anchored descriptors, so it drifts across a long session;
and this measures preference, not ground truth.

## Follow-up ideas

If you keep iterating: anchored scale descriptors on hover, a second-rater mode with
Cohen's κ, per-prompt-category breakdown, confidence intervals on the win rate, and an
import path so a CSV can be reloaded into a session.

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
