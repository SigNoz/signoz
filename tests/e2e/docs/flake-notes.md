# Flake notes

Measurements and budgets that would otherwise live as essays in the code. Add to
this file rather than to a comment.

## Workers are capped at 6

Playwright's local default is `cpus / 2`, which on a 32-core box is 16 — and 16
is strictly worse than 6 here, because every worker's browser shares one SigNoz
container.

Measured on `tests/alerts/{create,edit}` at `--repeat-each=3` (224 tests):

| Workers | Wall clock | Failures |
|---|---|---|
| 16 | 128 s | 3 |
| 6 | 119 s | 0 |

Past about six, the extra workers only add queueing, which shows up as 4-6 s app
mounts and save requests that outlive the test timeout — i.e. as flakes that look
like product bugs. The config caps rather than fixes the number, so a four-core
laptop still gets `cpus / 2`.

## `toPass` needs its own budget

`expect(...).toPass()` reads `expect.toPass.timeout`, **not** `expect.timeout`.
Without one it defaults to 0, which means "run to the test deadline" — and a
retry budget equal to the test timeout reports as a bare "Test timeout exceeded"
with no failing assertion and no steps, which is the least debuggable failure
Playwright can emit. Keep it strictly under `timeout`.

## Never `test.slow()` inside a helper

`test.slow()` multiplies the remaining budget by three on *every* call, so a
driver method that carries it and is called in a loop compounds: ten columns at
30 s × 3¹⁰ is about seven days. A test that never times out is strictly worse
than one that fails fast, because it wedges a worker until the whole run is
killed.

`allowFor(floor)` in `drivers/kit.ts` is absolute and monotonic instead: it
raises the budget to `floor` and never lowers it, so repeated calls and a spec's
own `setTimeout` settle on the largest value.

## Seeded data needs 30 s, not 15

A row appearing is not a render race but an *ingestion* one: the seeder's insert
has to become queryable in ClickHouse, and with six workers seeding at once that
regularly takes longer than the 15 s default expect budget. Failing at 15 s
produces "row not visible" on data that arrives a second later, which reads as
product flake and is not. `SEEDED_DATA_TIMEOUT` is 30 s and
`SEEDED_TEST_BUDGET` is 90 s.

## The seeder collides under parallel load

The seeder container shares one ClickHouse client, so concurrent POSTs from
parallel workers return a transient `500 concurrent queries within the same
session`. Both seeders retry that specific error with backoff and fail on
anything else.

With four workers seeding at once, `postToSeeder`'s old budget (6 attempts,
150 ms linear backoff, about 2 s in total) ran out on the traces explorer,
funnels and messaging-queue seeds. It is now 8 attempts at 500 ms (about 14 s).
The real fix is a lock or a client per request in `tests/seeder/server.py`.

## antd virtualises long dropdowns

A select over a global list — notification channels, for one — renders about ten
options into the DOM regardless of how many exist. Clicking an option by name
without typing a filter first is not a slow path, it is a missing element, and it
fails as a plain click timeout that reads like a renamed testid. Every driver
that picks from one of these searches first; see `antd.pickByName`.

## The `STRESS` throttle

`STRESS=1` enables 4× CPU throttling on the authenticated page, which reproduces
GitHub-runner conditions on a developer machine. Pair it with `CI=1` for the
two-worker, two-retry configuration. `STRESS_CPU_RATE` overrides the multiplier.

## Volume control needs a stack flag

`enable_metrics_reduction` is off by default, and without it the Volume Control
tab renders its "unavailable" state. `e2e_env` in `bootstrap/conftest.py` sets
`SIGNOZ_FLAGGER_CONFIG_BOOLEAN_ENABLE__METRICS__REDUCTION`, the same override
`tests/integration/tests/metricreduction/conftest.py` uses. A stack started
before the flag needs `--reuse --rebuild` to pick it up. `volume-control.spec.ts` still reads `/api/v1/features` and skips
when the flag is off, so an older stack skips instead of failing.

## Live tail pause needs a fixed wait

`tests/logs-explorer/live-tail.spec.ts` TC-02 proves a paused stream delivers
nothing, and absence has no DOM signal. The backend polls ClickHouse every 5 s
(`liveDataRefresh`), so the spec holds for 7 s (one tick plus slack) through
`live.expectAbsentFor` before resuming.

Resume opens a new stream whose window starts at the moment it connects, so a
row seeded while paused is stamped 60 s ahead. Stamped at "now" it would sit
before the new window and never arrive.

## The golden seed outlives the default test budget

`/seed/golden` took 27 s on the TrueNAS VM, against a 30 s local test timeout.
The setup test's budget sits above its own 120 s request timeout, so a slow seed
fails on the request and says so.

## The alert history editor can rotate typed text

`alerts.history.typeFilter` types into the CodeMirror editor right after the
page mounts. A keystroke that lands while the editor is still syncing its
initial value moves the cursor, so `nonexistent.key = 'x'` came out as
`onexistent.key = 'x'n` and the filter request never matched. The driver now
retypes until the editor holds the exact expression.

## Manage Shortcuts rows move while the modal zooms in

The antd modal is visible before its zoom-in ends. `shell.nav.dragShortcut`
measured the rows mid animation, so the drop missed and the saved order came
back unchanged. `openManageShortcuts` now waits for the zoom classes to clear,
and the drag nudges the pointer first so dnd-kit activates on the source row.

## The traces explorer editor moves once after mount

`QuickFiltersLayout` wraps the explorer in an `OverlayScrollbar` with `defer`,
so it initialises on idle and re-parents the content pane, query editor
included. Focus is restored but the caret lands at 0, so a key typed before
that moment ends up last: `service.name = 'x'` became `ervice.name = 'x's`.
`tracesExplorerDriver.goto` waits for `[data-overlayscrollbars-viewport]` in
the content pane before returning. The caret jump also hits a real user who
types within the first second; it came with #12915, not PR #12971.

The logs explorer, which `query-builder/token-highlight.spec.ts` types into,
uses the same layout: `k8s.namespace.name` came out as `8s.namespace.namek`.
`querySearch.apply` and `editor.type` retype until the editor holds exactly
the expression, and the colour checks use `toHaveCSS`, which retries, instead
of a fixed wait for the highlighter.

## Typing an expression logs parser errors

`parser/analyzeQuery.ts` builds an ANTLR parser without removing the default
console listener, so every incomplete prefix of a typed expression logs
`line 1:N missing ...` as a console error. Specs that type and then assert a
clean console filter those lines (`withoutParserNoise`).

## Seeded spans fill the APM materialized views

On the bootstrap stack, `top_level_operations` (services detail TC-05) and
`dependency_graph_minutes_v2` (service map TC-01) fill from spans the seeder
inserts into `signoz_index_v3`, within the 90 s seeded budget. Both specs
passed in the full run and in isolation; no seeder route is needed.

## Celery state tabs read one minute bucket

The celery state tabs reduce a 60 s series to its last point, so a count only
matches the seed when every task span lands in the same minute. The seed puts
all four in the last complete minute.

## Home checklist steps complete without a loading marker

Logs, traces, alerts, dashboards and saved-views steps flip to completed as
their widget queries resolve, and the checklist has no loading state for that.
`home.skippableSteps` polls until the list is unchanged for one second before
choosing a step. On a fully seeded stack every step completes and TC-03 skips.

## The explorer's floating view bar sits under the filters pane

At the 1280px viewport the bottom view bar (`explorer-views-select`, update and clear buttons) is centred on the page and partly covered by the 280px `z-index: 2` filters aside, which is also on main. Playwright's hit test fails, so the saved-views driver clicks the select near its right edge and uses `dispatchEvent('click')` for update and clear.

## The AWS account settings drawer footer sits below the viewport

At 1280x720 the region grid pushes the "Update Changes" footer to y=746, and the drawer content does not scroll, so Playwright reports "element is outside of the viewport". `aws.updateRegions` uses `dispatchEvent('click')` on `aws-update-account-btn`. The dialog CSS is identical in `@signozhq/ui` 0.1.0 and 0.2.0-rc.1.

## The alert history filter editor auto-closes quotes and shows its placeholder as text

`typeFilter` accepts one trailing auto-closed quote or bracket, and checks `.cm-placeholder` instead of empty text when clearing, because the placeholder is part of the editor's `textContent`.

## The funnel save request carries 200ms-old steps

The Save button enables on live `steps`, but the PUT body is built from `useDebounce(steps, 200)`. Saving right after the last select sends the previous value (an empty span name, a 400). The driver waits for the `FUNNEL_STEPS_<id>` draft, which the app writes from the same debounced value, to hold complete steps before clicking.

## The home checklist background covers the skip button

At 1280px the decorative `checklist-img-bg` sits over "Skip for now" and
intercepts pointer events, so a coordinate click never reaches the button. The
driver dispatches the click on the node instead.

## Home checklist skip, sidebar pin reload, volume-control label picker

`home.skip` does not hover: the item re-renders as sibling specs churn the data, so hover never saw it stable. The skip button is always in the DOM and disabled while the widget refetches, so the click retries until the item shows `skipped`. `nav.toggleWithShortcut` waits for the `sidenav_pinned` PUT and `nav.reloadSettled` for the preferences list, because the list overrides the cached pin and a toggle pressed before it lands is reverted. The volume-control label picker waits out `ant-select-loading` before typing, because the options arrive after the attribute keys query.

## Sign-out races requests still in flight

`DeleteToken` in `pkg/tokenizer/opaquetokenizer/provider.go` drops the cache entry
before the database row, and `getOrGetSetToken` re-caches whatever it read for
`Lifetime.Max`, 30 days. A request on the token that looks it up between the two
writes puts it back, and the revoked token keeps answering 200. That is a product
bug, and a browser cannot keep the page's own requests out of the window: with a
`networkidle` wait before the click (which resolves at once on a page that was
already idle), `auth/login` TC-05 still failed one full pass in two. TC-05 now
asserts the UI side, and `passwordauthn/09_tokenizer.py::test_logout_revokes_token`
checks revocation with nothing else in flight.

## Viewer specs and long forms get 60 s

`test.use({ as: 'viewer' })` provisions the user through the admin API and logs
it in on the first test of each worker, on top of the admin login that seeds.
Measured on a loaded shared stack, `dashboards/permissions` ran 41-47 s and the
planned-downtime and routing-policy forms 27-34 s, against the 30 s default.
Those describes set `timeout: 60_000`; the list suite does too, since its
create-through-the-modal case measured 29-33 s.

## A run with the setup project wipes everyone's telemetry

`bootstrap/global.teardown.ts` deletes every seeded trace, log and metric. Two
runs against one stack, one with deps and one with `--no-deps`, therefore race:
the second run's seeded traces vanish mid-test and the trace page lands on
NoData. When several people share a stack, run with `--no-deps`.

## querysearch.apply retypes, volume-control reseeds

`apply` retypes inside `toPass` until the editor text equals the expression, because the caret can jump after mount and rotate typed characters (`8s.pod.name...k`). The Volume Control tab ignores the URL range and uses 15m, so the label-picker spec reseeds the gauge right before opening the tab; the worker seed can be older than 15m under load.

## The Apdex panel's metadata 500 lands after the panels render

The service Overview's Apdex card mounts once its settings load, and only then
asks `/metric/metric_metadata` for `signoz_latency.bucket`. The stack never
ingests that metric and the endpoint answers 500 rather than 404, so whether a
spec saw the error depended on whether the response beat its last assertion. In
three full passes at four workers, `services/list` TC-02 failed all three and
`app-shell/routes` TC-03 two. They now drop that one URL (`withoutMissingMetadata`,
`allowFailures`), which the console watcher can match because a failed load's
entry ends with its URL. The axios error the DB Call and External tabs log for it
names no URL, so `withoutMissingMetadata` drops it only once the 500 was seen.

`app-shell/routes` TC-19 has the same shape: the AI observability overview's
dashboard toolbar asks for the public meta and an authz check under the
synthetic id `useSystemDashboard` assigns, both answer 400, and the probe failed
one pass in three.

## Traces never finish writing under Node 26

With Playwright 1.57 on Node 26, a failing test with tracing on also reports
"Test timeout exceeded" and leaves a truncated `trace.zip`; the same probe on
Node 24 writes the trace in a second. CI runs `lts/*`. Run the suite locally on
Node 24 (`mise exec node@24 -- …`) when you need traces.

## A lost click never opens its tab

`infra-monitoring/drawer` TC-07 ctrl-clicks a pod row and waits for the new tab.
In one full pass the click landed on the row and no tab opened, and the bare
`waitForEvent('page')` held the test to its 90 s budget. `clickForNewTab` in the
infra driver bounds the click and the wait, and clicks again only while no tab
has arrived, the same way `drawer.open` retries a swallowed click.

## The evaluation window popover ignores Escape

`alerts/create` TC-08 timed out in one full pass and in two of five repeats. The
evaluation settings popover is an antd `Popover` with `trigger="click"`, and
neither antd 5.11 nor `@rc-component/trigger` closes it on Escape, so
`selectEvaluationTimeframe` left it open. The next click outside usually closed
it, but when the popover covered the Advanced Options header, that click waited
on "intercepts pointer events" for the rest of the budget. The driver now closes
the popover through its trigger and waits for it to go.
