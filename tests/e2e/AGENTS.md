# Working in `tests/e2e`

Read this before adding or changing a spec.

## The five standards

| # | Standard |
|---|---|
| S1 | **Prose lives in docs.** A comment states a non-obvious constraint in a line or two. Measurements, incident history and "why this timeout" go to [`docs/flake-notes.md`](docs/flake-notes.md). |
| S2 | **Generated code is marked generated.** Transcribed data lives under a `__generated__/` path, carries a header saying how to regenerate it, and has something that re-derives it at runtime. |
| S3 | **One driver per feature.** A spec imports exactly one module: its feature's `test`. No feature helper takes a `page`. |
| S4 | **Cheapest layer that can catch it.** Four layers, in cost order: jest → Storybook + msw → pytest integration → Playwright. |
| S5 | **The API contract comes from the spec.** No hand-written response type for an endpoint `docs/api/openapi.yml` already describes. |

## S4, in practice — check before you write

Before writing a scenario, work out which layer already covers it. In order:

1. **Is it a pure function, a reducer, a config literal or a component's own
   behaviour?** Then it is jest. Grep `frontend/src/**/__tests__/` for the
   container first — most of them are covered far better than a browser could.
2. **Is it a rendered state that needs no backend** (empty, error, loading)?
   Storybook with msw, or jest with a fixed mock.
3. **Is it something the API does** — ordering, pagination, filter semantics,
   validation, roll-ups, "does this endpoint 500"? **Grep `tests/integration/`.**
   For infra monitoring and for alert evaluation the answer is almost always
   that it is already covered, per entity, headless.
4. **Only then**: does a real response have to reach a real DOM? That is an E2E.

Two directions worth knowing:

- **Infra monitoring**: `tests/integration/tests/inframonitoring/` is 123 test
  functions over 101 fixtures, driving the same list endpoints the UI calls. The
  E2E suite drives **one** entity; the other nine are covered by that suite plus
  `frontend/src/container/InfraMonitoringK8sV2/__tests__/entityConfig.test.ts`.
- **Alerts**: the integration suite owns **evaluation and delivery** — it seeds
  metrics, loads a rule, waits for the ruler and checks the webhook. Never
  assert firing behaviour in Playwright. The E2E suite asserts what the form
  offers and what a save persists.

## Layout

```
tests/e2e/
├── drivers/              # the kit and one module per feature
│   ├── kit.ts            # driver(), seeded(), allowFor(), the root `test`
│   ├── auth.ts           # login, per-worker storageState
│   ├── api.ts            # the authed HTTP client, seeder URL
│   ├── console.ts        # console/network watch
│   ├── storage.ts        # localStorage helpers
│   ├── tanstack.ts       # the shared table driver
│   ├── querysearch.ts    # the expression editor and its URL param
│   ├── antd.ts           # antd select primitives
│   ├── alerts/           # feature driver + seeds + generated payloads
│   └── infra/            # feature driver + seeds + __generated__/datasets.ts
├── tests/<feature>/      # specs, one directory per feature
├── testdata/             # static fixtures (marked generated)
├── bootstrap/            # pytest lifecycle, global setup and teardown
└── docs/flake-notes.md
```

## Writing a spec

```ts
import { expect, test } from '../../drivers/alerts';

test('TC-01 …', async ({ alerts, alertList }) => {
  await alerts.list.goto({ search: alertList.namePrefix });
  await expect(alerts.list.rows()).toHaveCount(10);
});
```

- One import. Take `authedPage` only for navigation, `goBack`,
  `waitForResponse` or a second tab. A `page.locator(...)` in a spec body is a
  driver method that is missing.
- Titles are `TC-NN <description>`.
- Each spec seeds its own data and cleans up. The bootstrap stack starts empty.
- Never assert "the table has exactly N rows" on an unscoped list: seeding is
  additive and six workers share one stack. Scope by a name you seeded.
- Names carry the worker index (`e2e-alert-list-w${workerIndex}-${Date.now()}`),
  so workers and repeat runs never collide.
- A write path attaches `waitForResponse` before the click, then reloads and
  re-reads from the server instead of trusting the optimistic update.
- A failing assertion gets a verdict with evidence: product bug or test bug.
  Never weaken it. A spec that cannot be made deterministic moves down a layer,
  or becomes `test.fixme` with the diagnosis in it.
- Green locally, red on CI? Run `STRESS=1 CI=1 pnpm test <path>` before filing
  a product bug.

## Seeding

| Scope | For | How |
|---|---|---|
| test | anything the test mutates | a test-scoped layer (`ownedRules`), or `try / finally` through the driver |
| worker | read-only data | `seeded()` |
| suite | a dataset only one file uses | `test.beforeAll` with `onAdminPage(browser, …)`, since `authedPage` is test-scoped |

Seeding reaches the backend one way: `apiDriver(page)` for control-plane
objects, the seeder for telemetry. The JWT lives in `localStorage`, so never
improvise with `page.request.*`.

| Data | Source |
|---|---|
| Alerts, dashboards, channels, views | created through the API by the spec, which picks the names |
| Traces, logs | a payload under `testdata/`, POSTed to the seeder |
| Infra monitoring metrics | the integration suite's fixtures, read by `seedDataset` (`drivers/infra/seed.ts`), never copied |

Assert on what `seedDataset` returned, never on names you typed.

## Adding a driver

A driver is a function that closes over the page and returns an object of
methods. Bind it into a layer with `driver()`, and compose the layers into the
feature's `test`:

```ts
export const withThing = driver('thing', ({ page }) => thingDriver(page));
export const test = withThing(withTanstack(kit));
```

Worker-scoped seeds use `seeded()`, which runs on a throwaway admin page and
tears down after. Drivers reuse each other by calling the factory directly,
never by reaching for another fixture.

- A method is navigation or a locator, never a scenario. A method that exists
  for one spec belongs in that spec; a flag that switches behaviour is two
  methods.
- Locate by testid. A missing one is added to the product in the same change.
  Role, label and CSS lookups are converted as you touch them; antd internals
  (`antd.ts`) are the exception.
- Never `test.slow()` in a driver: it triples the remaining budget on every
  call and compounds in loops. Use `allowFor(floor)`. Budgets and their
  measurements are in [`docs/flake-notes.md`](docs/flake-notes.md).

## Moving a test down a layer

Move it, do not delete it. The PR names the replacement for every browser test
it removes, by file and title:

```markdown
Moved to jest:
- search debounce → ListAlertRules/__tests__/search.test.tsx, "debounces to one request"
```

"It's covered in jest" names nothing a reviewer can check. If nothing replaces
it, the PR says so and why.

## Commits

Keep driver changes apart from everything else, so the history reads one
concern per commit:

1. `drivers/**` on its own. `.gitattributes` marks it generated, so it
   collapses in review and is read once.
2. Product changes the suite needs (testids) in their own commit.
3. Tests moved down a layer, per area.
4. Specs, one commit per area.

A new driver method goes in the driver commit even when one spec prompted it.
Every commit passes `pnpm typecheck` on its own, and the tip passes
`pnpm fmt:check` and `pnpm lint`.

## AI-maintained paths

- `drivers/infra/__generated__/datasets.ts` — transcribed facts about the
  integration suite's `.jsonl` fixtures. `assertDatasetFacts` re-derives every
  value at seed time, so a stale entry fails loudly.
- `testdata/**` — golden payloads. Marked `linguist-generated` in
  `.gitattributes`; review the thing that produces them, not the diff.

Do not hand-edit either without also updating what re-derives it.
