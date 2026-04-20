# results.json schema

Each run produces one `run-<N>/results.json` conforming to this shape. This is the diffable artifact — it's what lets a future run produce a meaningful `DIFF_vs_run-<N-1>.md`.

## Shape

```jsonc
{
  "run": 1,                            // integer, matches dir name (run-1 → 1)
  "date": "2026-04-19",                // ISO date of run
  "sessionTags": [                     // array, one per independent E2E_TAG used during the run
    "e2e-2095-1776624456",
    "e2e-2095-1776626343"
  ],
  "target": "https://full-mastodon.us.staging.signoz.cloud",
  "flows": [
    {
      "id": "flow-1",
      "name": "Alerts list, toggle, delete",
      "steps": [
        {
          "id": "1.1",                 // matches SUITE.md step id
          "name": "Empty list renders",
          "result": "pass",            // pass | fail | blocked | skipped
          "screenshot": "screenshots/01_step1_rules-list-empty.png",
          "network": [                 // array of captured req/resp dumps for this step; [] if none
            "network/01_step1.1_GET_rules.json"
          ],
          "notes": "Empty state copy visible; no spinner"
        },
        {
          "id": "1.5",
          "name": "Delete row",
          "result": "pass",
          "screenshot": "screenshots/01_step5_deleted.png",
          "network": [
            "network/01_step1.5_DELETE_rules.json",     // the delete itself
            "network/01_step1.5_GET_rules_b.json"       // auto-refetch that fired after
          ],
          "notes": "Row disappeared. DELETE returned 204; refetch confirms row is gone."
        }
        // ...
      ]
    }
    // ... flows 2-5
  ],
  "observations": [                    // free-form list of things noticed that aren't step-level pass/fail
    {
      "severity": "info",              // info | nit | bug | regression
      "title": "Direct-URL spinner on /alerts?tab=Configuration&subTab=planned-downtime",
      "where": "Flow 4 step 4.1a",
      "detail": "Page hangs on ant-spin; no GET /downtime_schedules fires until user navigates via tab click."
    },
    { "severity": "nit", "title": "PlannedDowntimeForm.handleOk logs validateFields rejection", "where": "PlannedDowntimeForm.tsx:250", "detail": "..." }
  ],
  "cleanupResidue": [                  // entities the suite couldn't clean up
    { "type": "rule", "name": "e2e-2095-1776626343-classic", "reason": "referenced by downtime whose cleanup path is blocked" },
    { "type": "downtime", "name": "e2e-2095-1776626343-downtime-linked", "id": "019da737-880e-796a-adc3-acf0b2161cc5", "reason": "edit drawer fails to hydrate alertRules so unlinking via UI has no effect" }
  ],
  "counts": {
    "steps": 29,
    "pass": 28,
    "fail": 1,
    "blocked": 0,
    "skipped": 0,
    "screenshots": 39
  }
}
```

## Rules for a re-run

1. **Step ids never change.** If a flow changes, append new steps (e.g. `1.7`) or mark old ones `retired`. This preserves diffability.
2. **`result` values are from a fixed set.** `pass | fail | blocked | skipped`. Do not invent new values.
3. **Screenshots must use the same filename pattern** as run-1 so a file-level diff remains tractable. Pattern: `<flow>_step<stepId>_<slug>.png`.
4. **Network captures follow a parallel filename pattern.** `<flow>_step<stepId>_<METHOD>_<endpoint-slug>.json` under `run-<N>/network/`. Multiple calls per step get `_a`, `_b` suffixes. Bodies are captured verbatim (no redaction). See `SUITE.md` "Capturing API request/response bodies per step".
5. **Observations** are separate from step results. Even if all 29 steps pass, regressions can surface as observations (e.g. a new console error not tied to a scenario).
6. **The diff between runs is computed from `results.json`.** Always fill in every field for every step in SUITE.md, even if you didn't learn anything new — a null/missing result on a future run will look like a step was skipped. Across runs, diffing request/response payloads between corresponding `network/*.json` files is a first-class signal for API contract drift.
