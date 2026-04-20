# Alerts + Planned Downtime regression suite

Playwright suite originally developed for `platform-pod/issues/2095-frontend` (migration of alerts and planned-downtime flows to generated OpenAPI clients + generated react-query hooks). 34 steps across 6 flows; mutates shared tenant state so runs serially regardless of config-level `fullyParallel`.

## Files

- [`SUITE.md`](./SUITE.md) — **stable spec.** What the suite tests and how to execute a run. Read this before driving a browser or modifying the spec.
- [`results-schema.md`](./results-schema.md) — shape of the per-run `results.json` diffable artifact used while this suite was still driven interactively.
- Spec lives at `tests/e2e/tests/alerts-downtime/alerts-downtime.spec.ts`.

## Running

Same lifecycle as the rest of the e2e suite — the pytest bootstrap provisions the backend and sets env vars, Playwright reads `.signoz-backend.json` via `global.setup.ts`.

```bash
# One-command run against a freshly-provisioned local backend
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --reuse --with-web \
  e2e/src/bootstrap/setup.py::test_setup
cd e2e
yarn test tests/alerts-downtime/

# Staging (requires SIGNOZ_E2E_USERNAME/PASSWORD in .env)
yarn test:staging tests/alerts-downtime/
```

Runtime is ~1m30s sequentially. Artifacts (network captures + screenshots) land in `tests/e2e/tests/alerts-downtime/run-spec-<ts>/` or `$RUN_OUTPUT_DIR` — gitignored.

## Open observations from the original regression runs

These are FE behaviours the 2095 runs surfaced that are not yet fixed. They should be resolved or formally acknowledged as working-as-intended before the suite is considered fully green.

1. **Error-surface inconsistency** (alert-delete modal vs downtime-delete toast). BE returns the same 409 shape for both; only FE render differs.
2. **`PlannedDowntimeForm.tsx:250`** `console.error`s the `validateFields` rejection — pre-existing nit.
3. **`.alert-details__header` selector** no longer matches after the v2 overview refactor; use `.alert-header__input` or `[data-testid=alert-name-input]`. SUITE.md step 3.2 needs an amend.
4. **V2 Save Alert Rule button enables without a metric** — toggling Routing Policies and skipping the metric selection lets the user click Save, which fails with 400 `invalid_input`. The error modal surfaces correctly, but the client-side gate should require a metric.
5. **`/api/v2/rules/test` bypasses threshold evaluation by design** — the test endpoint uses `WithSendUnmatched()`, so threshold matching does not gate the sample. `Footer.tsx:94-99` empty-result branch is only reachable via a zero-data query (nonexistent metric / empty filter), not an unsatisfiable threshold. SUITE.md step 2.12 should be amended to use a zero-data query instead of `target: 1e18`.
6. **Detection-method toggle is one-way (anomaly → threshold has no return path).** `CreateAlertRule/index.tsx:49-61` routes to the classic form only for `ANOMALY_BASED_ALERT` (or forced classic). V2 has no anomaly tab (`CreateAlertV2/AlertCondition/AlertCondition.tsx:43-51` comments it out), so users have no UI control to switch back without re-routing through `/alerts/type-selection`. SUITE.md step 6.6 should describe the asymmetric behavior, and the FE should either preserve detection-method tabs in V2 or add a "Switch back" affordance.
7. **v5 builder spec rejects function `namedArgs`.** Posting `functions: [{name:"anomaly", namedArgs:{z_score_threshold:3}}]` to `/api/v2/rules` returns 400 `unknown field "namedArgs"`. The FE's `prepareQueryRangePayloadV5.ts:186-204` converts `namedArgs → args:[{name,value}]` before posting; any direct-fetch test must do the same conversion.
