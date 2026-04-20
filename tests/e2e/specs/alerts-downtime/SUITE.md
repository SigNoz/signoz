# SUITE — platform-pod/issues/2095-frontend regression sweep

This file is the **stable specification** of the test suite. It doesn't record results — those live in per-run directories (`run-1/`, `run-2/`, …). Re-running the suite = following this file and producing a new `run-N/` from it.

## What this suite verifies

The branch `platform-pod/issues/2095-frontend` migrated the Alerts and Planned Downtime frontend flows to the generated OpenAPI clients and generated react-query hooks. Legacy adapters under `frontend/src/api/alerts/*` and `frontend/src/api/plannedDowntime/*` were deleted; ad-hoc types (`GettableAlert`) retired in favor of generated `RuletypesRuleDTO` / `RuletypesPlannedMaintenanceDTO`. The suite also exercises four real behavior fixes bundled with the refactor:

| Commit | Claim |
|---|---|
| `3db3a8626` | Null rules no longer cause infinite spinner |
| `684ef010d` | Alert detail maps HTTP 404 to `<AlertNotFound>` |
| `dc27a72bf` | Downtime ID kept as string (no number coercion) |
| `ddb0cb66e` | `convertToApiError` on save/delete paths, errors surface via `showErrorModal` |

## Environment

- Target: `baseURL` from `tests/e2e/playwright.config.ts` (set by `global.setup.ts` from the pytest-provisioned `.signoz-backend.json`, or `SIGNOZ_E2E_BASE_URL` in staging mode).
- Credentials: `SIGNOZ_E2E_USERNAME` / `SIGNOZ_E2E_PASSWORD` (pre-populated by the pytest bootstrap; only needed in `.env` for staging mode). Historical runs against `full-mastodon.us.staging.signoz.cloud` used `LOGIN_USERNAME` / `LOGIN_PASSWORD`.
- Driver: `tests/e2e/tests/alerts-downtime/alerts-downtime.spec.ts` via Playwright. Historical runs 1–6 were driven via Playwright MCP interactively.
- Prerequisite: the staging tenant must have at least one notification channel provisioned (Flow 5 selects `#staging-alerts`; if that exact channel isn't available, pick any channel and note the substitution in the run report)

## Naming conventions for destructive actions

Derive once per run: `E2E_TAG = e2e-2095-<unix-ts>`. Every entity created gets this prefix. Never delete anything that doesn't start with the current run's `E2E_TAG`.

## Suite structure

Six flows, 47 numbered steps total. Flow order: 1 depends on 2 (needs a rule to toggle/delete); best practice is `Flow 2 step 1-3 → Flow 1 → Flow 3 → Flow 4 → Flow 5 → Flow 6`. Each flow's detailed steps are below; full narrative with rationale lives in `run-1/0X-*.md` for reference.

Steps 2.8–2.10 were added after run-1 to cover the labels/annotations round-trip exposed by `types/api/alerts/convert.ts`. They are expected to appear as "new scenarios added since last run" in run-2's `DIFF_vs_run-1.md`.

Steps 2.11–2.13 were added after run-4 to cover the `/api/v2/rules/test` (Test Notification) endpoint and the V2 footer button's success / empty-result / validation-gated states (`CreateAlertV2/Footer/Footer.tsx:81-219`). They are expected to appear as "new scenarios added since last run" in run-5's `DIFF_vs_run-3.md`.

Flow 6 (anomaly alerts, steps 6.1–6.8) was added after run-5 to cover the anomaly-rule creation path, which always routes through the classic `FormAlertRules` on this branch (see `CreateAlertRule/index.tsx:49-61` — `CreateAlertV2` is never rendered when `alertType === ANOMALY_BASED_ALERT`). Expected to appear as "new scenarios added since last run" in the first full run after run-5.

Step 6.9 was added during run-6 to extend Flow 6 with `/api/v2/rules/test` coverage for the anomaly DTO (the classic anomaly form has no Test Notification button, so 6.9 is a direct-fetch API-contract probe). Expected to appear as "new scenarios added since last run" in the first run after run-6.

### Flow 1 — Alerts list, toggle, delete

Files exercised: `container/ListAlertRules/{ListAlert,DeleteAlert,ToggleAlertState}.tsx`.

| Step | Action | Expected | Regression-fix tie-in |
|---|---|---|---|
| 1.1 | Navigate `/alerts?tab=AlertRules` on a tenant with zero rules | Empty state (`No Alert rules yet.`) renders; no infinite spinner | `3db3a8626` |
| 1.2 | Open action menu (ellipsis) on a row | Menu shows Disable, Edit, Edit in New Tab, Clone, Delete | — |
| 1.3 | Click Disable | Status cell flips `OK` → `Disabled`; menu label flips to `Enable` | `patchRuleByID` roundtrip |
| 1.4 | Click Enable | Status flips back to `OK`; menu label back to `Disable` | same |
| 1.5 | Click Delete (no confirm modal for rules) | Row disappears from table immediately | `deleteRuleByID`; optimistic `setData` at `DeleteAlert.tsx:38` |
| 1.6 | Hard-refresh list | Row is gone | BE delete actually persisted |

### Flow 2 — Alert create, edit, clone

Files exercised: `container/CreateAlertV2/Footer/Footer.tsx`, `container/FormAlertRules/index.tsx`, `pages/AlertDetails/hooks.tsx::useAlertRuleDuplicate / useAlertRuleUpdate`, `types/api/alerts/convert.ts::toPostableRuleDTO` (labels / annotations mapping).

| Step | Action | Expected |
|---|---|---|
| 2.1 | Click `New Alert Rule` → v2 metric-based form opens | Form renders; Save disabled |
| 2.2 | Fill name `${E2E_TAG}-create`, pick first metric (e.g. `app.ads.ad_requests`), threshold default 0 | Chart plots; Save still disabled (channel/routing required) |
| 2.3 | Enable `Use Routing Policies` toggle (or select the test channel if configured) | Save enables |
| 2.4 | Click Save Alert Rule | Redirect to list; row `${E2E_TAG}-create` appears with status `OK` |
| 2.5 | Click row → overview loads → rename to `${E2E_TAG}-renamed` via header input → Save | Redirect to list; row name updated |
| 2.6 | Open menu → Clone | New rule `${E2E_TAG}-renamed - Copy` created; navigation lands on its overview URL |
| 2.7 | Visit History tab from the cloned overview | History widgets (TOTAL TRIGGERED / AVG RESOLUTION TIME / TOP CONTRIBUTORS) render; no spinner |
| 2.8 | On a fresh `/alerts/new` form, after 2.1–2.3: add two labels via the labels input — `env=prod`, `severity=warn`; fill annotations `description=${E2E_TAG}-desc`, `summary=${E2E_TAG}-summary`; name `${E2E_TAG}-labels`. Save; capture POST body to `network/02_step2.8_POST_rules.json` | POST body `labels` object contains exactly `{env: "prod", severity: "warn"}`; `annotations` carries the description/summary. Row `${E2E_TAG}-labels` appears in list |
| 2.9 | Click the `${E2E_TAG}-labels` row → open its Edit form | Labels input shows both chips; annotations inputs rehydrate with the saved description/summary |
| 2.10 | In the Edit form: clear the **value** of the `severity` label (leave the key, blank the value); Save; capture PUT body to `network/02_step2.10_PUT_rules.json` | Document the resulting PUT body's `labels` shape. Two behaviors possible and both are acceptable to observe — note whichever occurs: (a) `severity` key retained with `""` value (UI passes empty strings through; `stripUndefinedLabels` only filters `undefined`), or (b) `severity` key absent (UI coerces blank to `undefined` and our helper drops it — this is the **silent ignore** surface) |
| 2.11 | On a fresh `/alerts/new` V2 form, fill name `${E2E_TAG}-test-notif`, pick a metric known to produce non-zero values on staging (e.g. `app.currency_counter` — the one run-3 used for 2.4), leave threshold default (target `0`, op `>`), enable `Use Routing Policies`. Click `Test Notification`. Capture request + response to `network/02_step2.11_POST_rules_test.json` | `POST /api/v2/rules/test` fires with a full `RuletypesPostableRuleDTO` body (same shape as the create POST in `run-3/network/02_step2.4_POST_rules.json`: top-level `alert`, `condition`, `annotations`, `labels`, `notificationSettings.usePolicy: true`, `evaluation`). Response 200 with `data.alertCount > 0`. Toast `Test notification sent successfully` (green). Nothing persisted — the rule does **not** appear in the list. Button icon is `<Loader>` during the request, reverts to `<Send>` on completion. Covers `Footer.tsx:94-102` success branch |
| 2.12 | Same form as 2.11, but before clicking Test Notification change the threshold target to `1e18` (or any value the metric can't exceed) with op `>`. Click `Test Notification`; capture to `network/02_step2.12_POST_rules_test.json` | `POST /api/v2/rules/test` returns 200 with `data.alertCount === 0`. Toast `No alerts found during the evaluation. This happens when rule condition is unsatisfied. You may adjust the rule threshold and retry.` (red). No persisted rule. Covers the empty-result branch at `Footer.tsx:94-99` |
| 2.13 | On a fresh V2 form with name empty and no metric picked, inspect the `Test Notification` button. Hover to read the tooltip. Then fill name + metric + routing; re-inspect | While validation fails: button has `disabled` attribute, Ant tooltip shows the message from `validateCreateAlertState` (e.g. name-required or channel-required — whichever the current branch surfaces). No `POST /api/v2/rules/test` fires while disabled. Once validation passes, the button becomes enabled (no tooltip). Covers `Footer.tsx:169-170,204,210-211` and reinforces 2.3's gating contract |

Notes on **silent ignore** for future sessions: `convert.ts::stripUndefinedLabels` drops entries whose value is `undefined` (not entries whose value is `""`). The UI rarely produces an `undefined`-valued label directly — most inputs produce strings, possibly empty. Step 2.10 is the closest black-box probe. Authoritative coverage of the `undefined` filter lives (or will live) in a Jest test for `convert.ts`; if that test is missing, flag it as an observation rather than a step failure.

### Flow 3 — Alert details and 404

Files exercised: `pages/AlertDetails/{AlertDetails,AlertHeader/AlertHeader,hooks}.tsx`, `pages/AlertDetails/AlertNotFound/AlertNotFound.tsx`.

| Step | Action | Expected | Regression-fix tie-in |
|---|---|---|---|
| 3.1 | On a valid rule's `/alerts/overview?ruleId=<id>` | Breadcrumb `Alert Rules/<id>`, AlertHeader, Overview+History tabs, chart | — |
| 3.2 | DOM probe: `.alert-details__header`, `.ant-breadcrumb`, tab count | All present (tab count ≥ 2) | — |
| 3.3 | Click History tab | History page loads with the three widgets | — |
| 3.4 | Visit `/alerts/overview?ruleId=00000000-0000-0000-0000-000000000000` | `<AlertNotFound>` renders; document title = `Alert Not Found`; two reason panels | `684ef010d` |
| 3.5 | Visit `/alerts/overview` with no query params | Same `<AlertNotFound>` render (`!isValidRuleId` branch) | `AlertDetails.tsx:107` |
| 3.6 | Delete a rule, then revisit its overview URL | `<AlertNotFound>` render (HTTP 404 → error branch) | `684ef010d` |

### Flow 4 — Planned Downtime CRUD

Files exercised: `container/PlannedDowntime/*`.

| Step | Action | Expected | Regression-fix tie-in |
|---|---|---|---|
| 4.1a | Deep-link to `/alerts?tab=Configuration&subTab=planned-downtime` in a fresh tab | List renders | **Known FAIL (run 1)** — infinite spinner; no `GET /downtime_schedules` fires |
| 4.1b | From `/alerts?tab=AlertRules`, click `Configuration` tab → Planned Downtime sub-tab | List renders | — |
| 4.2 | Click `New downtime`, fill name `${E2E_TAG}-downtime-once`, start = today, end = tomorrow, timezone UTC, no alerts selected, `Does not repeat`, submit | Row appears with `24 hours` duration chip and start-time caption | `b608ac6f8`, `739c868ef` |
| 4.3 | Probe validation: submit with `Ends on` empty | Inline red error `Please enter Ends on` | client-side validation |
| 4.4 | Click pencil → edit name to `${E2E_TAG}-downtime-edited` → `Update downtime schedule` | Row name updates; `24 hours` duration preserved | `dc27a72bf` |
| 4.5 | Click trash → `Delete Schedule` modal → confirm | Row removed; list returns to `No data` | — |

### Flow 5 — Classic experience + cascade-delete error paths

Files exercised: `container/FormAlertRules/index.tsx` (classic form), `DeleteAlert.tsx`, `PlannedDowntimeForm.tsx`, `PlannedDowntimeDeleteModal.tsx`, `api/ErrorResponseHandlerForGeneratedAPIs.ts`.

| Step | Action | Expected | Regression-fix tie-in |
|---|---|---|---|
| 5.1 | `/alerts/new` → click `Switch to Classic Experience` | URL gains `showClassicCreateAlertsPage=true&ruleType=threshold_rule`; classic `FormAlertRules` renders with 3-step layout | — |
| 5.2 | Fill: first metric, name `${E2E_TAG}-classic`, select channel from `Notification Channels` dropdown | `Create Rule` enables | — |
| 5.3 | Click `Create Rule`, confirm `Save Changes` modal OK | Redirect to list; row `${E2E_TAG}-classic` with severity `warning` | `createRule` generated client |
| 5.4 | Create downtime `${E2E_TAG}-downtime-linked` (see Flow 4 steps for mechanics) and attach the classic alert in `Silence Alerts` | Downtime row shows the `24 hours` chip; `${E2E_TAG}-downtime-linked` created | — |
| 5.5 | Alert Rules tab → ellipsis on the classic alert → Delete | **Error modal** surfaces: `already_exists` code, message `"cannot delete rule because it is referenced by a planned maintenance, remove the rule from the planned maintenance first"`. Row remains. | `ddb0cb66e` → `showErrorModal` |
| 5.6 | Configuration → trash on the downtime → `Delete Schedule` | **Error notification (toast)**: same `already_exists` code, message `"cannot delete planned maintenance because it is referenced by associated rules, remove the rules from the planned maintenance first"`. Network DELETE returns 409. Row remains. | `ddb0cb66e` |

### Flow 6 — Anomaly alerts

Files exercised: `pages/AlertTypeSelection/AlertTypeSelection.tsx`, `container/CreateAlertRule/SelectAlertType/index.tsx`, `container/CreateAlertRule/index.tsx:49-61` (classic-vs-V2 dispatch), `container/FormAlertRules/index.tsx` (with `ruleType=anomaly_rule`), `container/FormAlertRules/RuleOptions.tsx:100-124,381-390` (anomaly-specific inputs — z-score, seasonality), `ee/query-service/rules/anomaly.go` (BE evaluation).

Anomaly alerts use the **classic** form exclusively on this branch. The V2 anomaly tab in `CreateAlertV2/AlertCondition/AlertCondition.tsx:43-51` is commented out; `buildCreateAnomalyAlertRulePayload` in `CreateAlertV2/Footer/utils.tsx:291` is still a TODO stub. The classic flow serializes anomaly as a query function: `functions: [{ name: "anomaly", namedArgs: { z_score_threshold: <n> } }]` with `ruleType: "anomaly_rule"`, `alertType: "METRIC_BASED_ALERT"` (see `FormAlertRules/index.tsx:216-233`).

**Prerequisite:** tenant must have the `anomaly_detection` feature flag active (`constants/features.ts:9`). Without it, the type-selection card is hidden but direct-URL access still works. Step 6.1 gates on the flag; if it's off, mark 6.1 as `blocked` in the run and skip to 6.2 via direct URL.

| Step | Action | Expected |
|---|---|---|
| 6.1 | Navigate `/alerts/type-selection`. Observe alert-type cards rendered | With `anomaly_detection` flag on: five cards including an **Anomaly** card with a `Beta` tag (`data-testid="alert-type-card-ANOMALY_BASED_ALERT"`). With flag off: only four cards, no Anomaly entry. |
| 6.2 | Click the Anomaly card (or if flag off, direct-URL to `/alerts/new?ruleType=anomaly_rule&alertType=METRIC_BASED_ALERT`) | Page lands on `/alerts/new?ruleType=anomaly_rule&alertType=METRIC_BASED_ALERT`. Classic `FormAlertRules` renders (not `CreateAlertV2`), top-of-page detection-method tabs show `Threshold Alert` and `Anomaly Detection Alert` with the anomaly tab selected. |
| 6.3 | On the anomaly form: pick a metric with data on staging (e.g. `app.currency_counter`), fill name `${E2E_TAG}-anomaly`, leave z-score deviation at default (`3`), pick a channel from `Notification Channels` | `Create Rule` enables. The query-builder chart preview renders with the overlay/anomaly-band UI specific to `ruleType=anomaly_rule` (`FormAlertRules/ChartPreview/index.tsx:338`). |
| 6.4 | Click `Create Rule` → confirm the `Save Changes` modal OK. Capture POST body to `network/06_step6.4_POST_rules.json` | POST `/api/v2/rules` => 201. Body has `ruleType: "anomaly_rule"`, `alertType: "METRIC_BASED_ALERT"`, and `condition.compositeQuery.builder.queryData[0].functions` contains `{ name: "anomaly", namedArgs: { z_score_threshold: 3 } }`. Redirect to list; row `${E2E_TAG}-anomaly` appears (rule type visible in the row or accessible via detail). |
| 6.5 | Click the row → overview loads → click Edit. Change the z-score deviation from `3` to `5`. Save. Capture PUT body to `network/06_step6.5_PUT_rules.json` | PUT `/api/v2/rules/<id>` body's `functions[anomaly].namedArgs.z_score_threshold` is `5` (serialized via `FormAlertRules/index.tsx:216-233`'s z-score branch). List reflects the update after redirect. |
| 6.6 | On a fresh `/alerts/new?ruleType=anomaly_rule&alertType=METRIC_BASED_ALERT`, click the `Threshold Alert` detection-method tab | URL updates to `ruleType=threshold_rule` (`FormAlertRules/index.tsx:245-259` useEffect). The anomaly function is **removed** from `currentQuery.builder.queryData[*].functions` (`FormAlertRules/index.tsx:234-240`). Switching back to `Anomaly Detection Alert` re-adds the anomaly function with the current `z_score_threshold`. No network call fires on tab toggles. |
| 6.7 | From the list: ellipsis on the `${E2E_TAG}-anomaly` row → Delete. Capture DELETE to `network/06_step6.7_DELETE_rules.json` | DELETE `/api/v2/rules/<id>` => 204 (same path as threshold delete). Row disappears; hard-refresh confirms. |
| 6.8 | Visit the deleted anomaly rule's overview URL (`/alerts/overview?ruleId=<id>`) | `<AlertNotFound>` renders — same 404 branch as Flow 3.6. Confirms the detail page's AlertNotFound path works for anomaly rules too, not just threshold. |
| 6.9 | `POST /api/v2/rules/test` with the anomaly DTO from 6.4 (no rule needs to exist; this is a fire-and-forget evaluation). Capture to `network/06_step6.9_POST_rules_test.json`. | 200 with `data.alertCount >= 1` and `message: "notification sent"`. Confirms `/api/v2/rules/test` accepts the anomaly rule shape (`ruleType: "anomaly_rule"`, `condition.algorithm`, `condition.seasonality`, `functions[anomaly]`) and returns the same envelope shape as a threshold test. **No UI driver** for this step — the classic anomaly form has no Test Notification button (Flow 2.11–2.13's button is V2-only); `06.9` is an API-contract probe via direct fetch. The BE-side observation from run-5 (`SendUnmatched` bypasses threshold evaluation) applies here too — `alertCount: 0` is reachable only via a zero-data query, not via threshold tweaking. |

Notes for future runs:
- **FE serialization is z-score-only** on this branch. The `seasonality` / `algorithm` fields surfaced by `AnomalyThreshold.tsx` (V2) are not sent by the classic form's POST body. If a future run observes `seasonality` or `algorithm` keys in `06_step6.4_POST_rules.json`, flag as new coverage.
- **BE evaluation** lives in `ee/query-service/rules/anomaly.go` (daily provider by default; hourly/weekly selected by the `seasonality` field when sent). Not directly probed by UI regression — BE-unit tests at `ee/query-service/rules/anomaly_test.go` are the authoritative source.
- The **Test Notification** button from Flow 2.11–2.13 is V2-only and does **not** render on the classic anomaly form. Step 6.9 probes the same endpoint by direct fetch with the anomaly DTO; if the V2 anomaly tab is uncommented in a future branch, add a UI-driven sibling step (e.g. `6.9b`) that clicks the V2 footer button.

## Cleanup

End-of-run: every entity named `${E2E_TAG}*` must be removed. Alerts: menu → Delete. Downtime: trash → confirm. Verify no residue remains before wrapping.

**Known blocker for Flow 5 cleanup (run 1)**: after creating the downtime-linked entities, the UI's "edit downtime → remove silenced alert → delete downtime → delete alert" path does not actually clear the server-side association. See `run-1/05-classic-and-cascade-delete.md` "Cleanup residue" for the hypothesis. If this remains true in run-N, document it as cleanup residue and move on.

## How to execute a new run

Follow this procedure if you (a future LLM session) are asked to re-run the suite.

1. Artifacts land at `tests/e2e/tests/alerts-downtime/run-spec-<ts>/` (or `$RUN_OUTPUT_DIR` if set). Derive a new `E2E_TAG` from `date +%s` — the spec does this at module load.
2. Log in to staging via Playwright MCP (reuse existing session cookie if available).
3. Walk Flows 1–5 step-by-step. For each step:
   - Take a screenshot with filename `<flow>_step<stepId>_<slug>.png` and save to `run-<N>/screenshots/`.
   - Record observed state (DOM probe results, notification text, network response codes) in the per-flow markdown log.
   - Mark each step as `pass` / `fail` / `blocked` / `skipped`.
4. Write per-flow logs to `run-<N>/0X-*.md` with the same structure as `run-1/` (one table per flow, one row per step, screenshot and network-capture links per row).
5. Write `run-<N>/results.json` conforming to the schema in `results-schema.md`. This is the diffable artifact.
6. Write `run-<N>/RUN_REPORT.md` — narrative summary.
7. Write `run-<N>/DIFF_vs_run-<N-1>.md` comparing the two runs. Use the comparison template below.

### Capturing API request/response bodies per step

Every step that triggers a backend call (create, update, delete, toggle, list refetch, etc.) must also save the request + response payload. Do **not** embed the bodies inline in the markdown — dump them to files under `run-<N>/network/`, one JSON per step.

Filename pattern: `<flow>_step<stepId>_<METHOD>_<endpoint-slug>.json`
Examples:
- `02_step2.4_POST_rules.json` — create alert (Flow 2 step 2.4)
- `04_step4.4_PUT_downtime_schedules.json` — update downtime
- `05_step5.5_DELETE_rules.json` — the BE rejection when deleting a referenced alert
- `05_step5.6_DELETE_downtime_schedules.json` — the HTTP 409 on the referenced-downtime delete

File shape:

```jsonc
{
  "request": {
    "method": "POST",
    "url": "/api/v1/rules",
    "headers": { /* verbatim */ },
    "body": { /* parsed JSON or null */ }
  },
  "response": {
    "status": 200,
    "headers": { /* verbatim */ },
    "body": { /* parsed JSON or text */ }
  },
  "step": "2.4",
  "flow": "flow-2"
}
```

Capture bodies verbatim — no redaction. Capture mechanics via Playwright MCP: after the action that fires the call, use `browser_network_requests` with `requestBody: true` and the endpoint regex as `filter` to capture the request. For response bodies, the simplest path is `page.on('response', ...)` before the action fires — alternatively, re-issue the call via `browser_evaluate` + `fetch` and save both sides.

Rules:
- **Only capture calls we triggered**: don't dump unrelated polling, telemetry, or preference reads.
- **One file per call**; if a step triggers multiple calls (e.g. delete then list refetch), append `_a`, `_b` to the filename.
- **Reference the file from `results.json`** via the `network` field — see `results-schema.md`.

For `GET` refetches that fire automatically after a mutation, capture is encouraged when:
- The response shape might change between runs (API contract drift).
- The step's assertion depends on the response (e.g. "new row appears" → the list-refetch response tells you whether the row is really there).

## Diff template (run-N vs run-(N-1))

```markdown
# Diff — run-<N> vs run-<N-1>

Dates: <old date> → <new date>
Session tags: <old> → <new>

## Results delta

| Scenario | run-<N-1> | run-<N> | Delta |
|---|---|---|---|
| 1.1 Empty list renders | pass | pass | same |
| 1.5 Row delete | pass | pass | same |
| ... | ... | ... | ... |
| 4.1a Deep-link spinner | FAIL | pass | **FIXED** |
| 5.6 Downtime delete error | pass | FAIL | **REGRESSED** |

## Newly passing (regressions fixed)
- <list of IDs that went fail → pass>

## Newly failing (regressions introduced)
- <list of IDs that went pass → fail>

## New scenarios added since last run
- <list>

## Retired / removed scenarios
- <list>

## Cleanup residue delta
- <what entities remained after each run, whether cleanup path still blocked>

## Notes for the next run
- <observations that might matter next time>
```

Produce the diff by reading both runs' `results.json` and narrating the deltas. Screenshots aren't image-diffed automatically — only flag visible differences that were observed during live driving.

## Schema for `results.json`

See `results-schema.md` for the exact shape. Keep step `id` values stable across runs (e.g. `1.1`, `2.7`, `4.1a`) so diffs are straightforward.

## Updating this spec

If a flow gains or loses steps on develop, update this file AND `results-schema.md` before the next run so the diff comparison remains meaningful. Never rename existing step IDs — only append new ones or mark old ones as `retired`.
