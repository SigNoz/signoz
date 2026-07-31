# Proposal: Guard Frontend Bundle Size (and Perf Hygiene) in CI

**Status:** Draft / for discussion
**Area:** Frontend build & CI
**Audience:** Frontend engineers, reviewers, maintainers

## TL;DR

SigNoz's frontend already has strong CI hygiene — typecheck, lint, format, unit
tests with coverage thresholds, E2E, and Sentry. But there is **no gate that
notices when a change makes the app bigger or slower to load.** Bundle size only
grows, silently, one PR at a time, until users on the login page are downloading
several megabytes of JavaScript before they see a chart.

This document explains **why** we should add a bundle-size budget to CI (and
close a few adjacent gaps), what it costs us not to, and what "done" looks like.
The implementation details live in a follow-up; this is the case for doing it.

## Background: where we are today

What the frontend build already does well:

- Route-level code splitting via `Loadable` (lazy-loaded page components).
- Local bundle analysis available through `rollup-plugin-visualizer`
  (`BUNDLE_ANALYSER=true pnpm build`).
- Production `browserslist` targets, image optimization, and gzip compression
  in the Vite build.
- Coverage thresholds, commit linting, pre-commit hooks — the usual guardrails.

What it does **not** do:

- **Nothing measures the built bundle on a PR.** The visualizer is opt-in and
  local, so it only gets looked at when someone already suspects a problem.
- **No `manualChunks` strategy.** Beyond route splitting, vendor code is chunked
  by the bundler's defaults. A single heavy dependency added to a shared module
  can land in the initial payload with no signal to the author or reviewer.
- **No size budget.** There is no number a PR can exceed, so there is nothing to
  fail.

## The problem

Bundle size is a **one-way ratchet without a gate.** Every feature adds code;
almost none removes it. The frontend currently ships ~98 runtime dependencies,
several of them large (antd, monaco-editor, codemirror, chart.js, uplot,
react-force-graph, and *three* separate drag-and-drop libraries). Any of these
can be pulled into a shared chunk by a single innocent-looking import, and today
that change sails through review because:

1. **Reviewers can't see it.** A diff shows `+import { Foo } from 'heavy-lib'`.
   It does not show that `heavy-lib` is 300 kB and was not previously in that
   chunk. Size regressions are invisible in the exact place we make the
   accept/reject decision.
2. **It's death by a thousand cuts.** No single PR "feels" responsible. Each one
   adds a few kB; the aggregate is what users feel. Without per-PR measurement,
   nobody owns the total.
3. **The cost lands on users, not authors.** The engineer adding the dependency
   has a warm cache and a fast laptop. The regression is paid by a user opening
   SigNoz for the first time, often the moment they're evaluating the product.

## Why this matters for SigNoz specifically

This is not generic "perf is good" advice. Three things make bundle size
unusually load-bearing for us:

- **We are an observability tool. First-load latency is the first impression.**
  A prospective user's very first interaction is often a cold load of the app
  during evaluation. Time-to-interactive on that first paint is a product
  surface, not just an engineering metric.
- **Self-hosted and air-gapped deployments.** Many SigNoz users run it on their
  own infrastructure, sometimes behind slow or constrained networks, sometimes
  on modest hardware. We do not control their CDN or their bandwidth. A bloated
  bundle degrades the self-hosted experience in ways we never see in our own
  telemetry.
- **The dependency surface is already heavy and partially redundant.** Three
  drag-and-drop libraries and an in-flight `react-query` → `@tanstack` and
  `react-router` v5 → v6 migration mean the tree is in motion. A budget turns
  "we should really consolidate these someday" into a measurable, enforceable
  target instead of a good intention.

## Why now

- **The cheapest time to catch a regression is in the PR that causes it.** Once
  a heavy dependency is merged and built on top of, removing it is a
  multi-PR archaeology project. A gate makes the author fix it while the context
  is fresh and the change is one line.
- **The tooling is already 80% here.** We have the visualizer and a Vite build
  that emits everything a budget check needs. We are adding a threshold and a CI
  job, not a new build system.
- **Regressions compound.** Every month without a gate is another month of
  un-noticed growth baked into the baseline, which makes any future budget
  harder to set at a meaningful number.

## What we propose (the "why", not the "how")

The goal is a **fast, boring, deterministic signal on every PR**: did this change
grow the bundle, and by how much? Concretely, that means:

1. **A size budget measured on the real production build**, expressed as gzipped
   kB per meaningful chunk (initial/entry, and the heavy vendors we care about).
   A PR that pushes a chunk over budget fails, the same way a failing test does.
2. **A visible per-PR delta.** Reviewers should see "entry chunk +42 kB" in the
   PR, so the size cost of a change is part of the review conversation, not an
   afterthought.
3. **A deliberate `manualChunks` split** so the budgets map to stable, named
   chunks (editor, charting, antd, etc.) instead of a single opaque vendor blob.
   This is what makes the budget numbers meaningful and stable across PRs.

The budget is a **ratchet we control**: set it slightly above today's real size,
then tighten it as we consolidate dependencies. It is not meant to block work —
it's meant to make the size cost of a change *a conscious decision* rather than
an accident.

## Adjacent gaps worth closing at the same time

These share the same theme — "make invisible regressions visible" — and are
cheap to add alongside:

- **Automated dependency updates.** There is no `dependabot.yml` / Renovate
  config; updates are manual. This matters for both security and for keeping the
  dependency tree (and therefore the bundle) current.
- **Wire `knip` into CI.** It's already installed and configured but never runs,
  so unused dependencies and dead exports — direct bundle bloat — accumulate
  silently.

## Non-goals

- This is **not** a Lighthouse/runtime-performance suite. Those are valuable but
  separate; this proposal is scoped to build-output size, which is the highest
  leverage, lowest-flakiness signal we can add today.
- This is **not** an attempt to hit a specific "good" number immediately. Step
  one is *measuring and freezing* today's baseline. Reducing it is follow-up
  work that the gate makes possible.

## What "done" looks like

- Every PR reports the size of key chunks and the delta vs. the base branch.
- A PR that exceeds the budget fails CI with a clear message pointing at the
  offending chunk.
- The budget lives in-repo, versioned, and is tightened deliberately as the
  dependency tree is consolidated.
- Reviewers treat a size increase as something to justify, the same way they'd
  justify dropping test coverage.

## Cost and risk

- **CI time:** one extra production build (already fast under Rolldown/Vite).
  Can run in parallel with existing `jsci` jobs.
- **False positives:** a legitimate large feature may need the budget raised —
  that's a one-line, reviewed change to the budget file, which is exactly the
  conversation we want to be having explicitly.
- **Maintenance:** near zero once `manualChunks` is stable. The budget file is
  the only thing to touch, and only when we consciously accept a size change.

The cost is small and paid by us, once. The status quo cost is unbounded and
paid by users, forever.
