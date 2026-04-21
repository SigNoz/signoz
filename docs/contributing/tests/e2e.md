# E2E tests

Playwright-based end-to-end suite for the SigNoz frontend. Wired into the
shared pytest project at `tests/` — pytest fixtures bring up a containerized
backend (ClickHouse + Postgres + migrator + SigNoz-with-web), register an
admin, and seed dashboards/alerts/telemetry before Playwright runs.

Source lives at `tests/e2e/`.

## Layout

```
tests/e2e/
  bootstrap/
    setup.py          Brings backend + seeder up; writes .env.local
    run.py            One-command entrypoint: subprocesses `yarn test`
  tests/              Playwright .spec.ts files (per-feature dirs)
  fixtures/auth.ts    authedPage Playwright fixture + ensureLoggedIn helper
  playwright.config.ts  Loads .env (user) + .env.local (generated) via dotenv
```

Each spec owns its own data. Telemetry goes through the seeder
(`tests/seeder/`, exposing `/telemetry/{traces,logs,metrics}` POST+DELETE);
dashboards, alert rules, and org config go through the SigNoz REST API
directly from the spec. No global pre-seeding fixtures.

## Running

### One-command local run

Pytest owns the lifecycle: provisions containers, registers the admin,
starts the seeder, writes backend coordinates to `tests/e2e/.env.local`
(loaded by `playwright.config.ts` via dotenv), then shells out to
`yarn test`:

```bash
cd signoz/tests
uv sync                                               # first time only
uv run pytest --basetemp=./tmp/ -vv --with-web \
  e2e/bootstrap/run.py::test_e2e
```

### Iterative Playwright development

Bring the backend up once (`--reuse` keeps containers warm), then drive
Playwright directly:

```bash
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --reuse --with-web \
  e2e/bootstrap/setup.py::test_setup

cd e2e
yarn install && yarn install:browsers                 # first time
yarn test                                             # headless
yarn test:ui                                          # interactive
yarn test:headed                                      # headed
yarn test:debug                                       # step-through
yarn test tests/roles/roles-listing.spec.ts           # single file
```

Teardown:

```bash
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --teardown \
  e2e/bootstrap/setup.py::test_teardown
```

### Staging fallback

Point `SIGNOZ_E2E_BASE_URL` at a remote env via `.env` — no local
backend bring-up, no `.env.local` generated, Playwright hits the URL
directly:

```bash
cp .env.example .env              # fill SIGNOZ_E2E_USERNAME / PASSWORD
yarn test:staging
```

### Environment variables

| Variable | Description |
|---|---|
| `SIGNOZ_E2E_BASE_URL` | Base URL (staging mode) |
| `SIGNOZ_E2E_USERNAME` | Test user email (staging mode) |
| `SIGNOZ_E2E_PASSWORD` | Test user password (staging mode) |

## Writing tests

```typescript
import { expect, test } from '@playwright/test';
import { ensureLoggedIn } from '../../fixtures/auth';

test.describe('Feature name', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto('/feature');
  });

  test('Test name', async ({ page }) => {
    // steps
  });
});
```

### Locator priority

1. `getByRole('button', { name: 'Submit' })`
2. `getByLabel('Email')`
3. `getByPlaceholder('...')`
4. `getByText('...')`
5. `getByTestId('...')`
6. `locator('.ant-select')` — last resort (Ant Design dropdowns often have
   no semantic alternative)

### Conventions

- Unique test data: `` const name = `Test ${Date.now()}`; ``
- Prefer explicit waits over `page.waitForTimeout(ms)`:
  ```typescript
  await expect(page.getByRole('dialog')).toBeVisible();   // good
  await page.waitForTimeout(5000);                        // avoid
  ```
- Never commit `test.only` or untagged tests.

## AI-assisted test authoring (optional)

Playwright's `init-agents` workflow is wired up for Claude Code and VS Code
Copilot. Agents live in `tests/e2e/.claude/agents/` and
`.github/chatmodes/` respectively. Re-run after each Playwright version
upgrade:

```bash
npx playwright init-agents --loop=claude
npx playwright init-agents --loop=vscode
```

Three agents:

| Agent | Input | Output |
|---|---|---|
| `playwright-test-planner` | URL + seed test | Markdown plan (local scratch) |
| `playwright-test-generator` | Plan + seed test | `tests/<feature>/<feature>.spec.ts` (validated live) |
| `playwright-test-healer` | Failing spec + error | Patched spec, or `test.fixme()` with a reason |

Planner output is scratch — the `.spec.ts` is the source of truth. A
`specs/` dir is `.gitignore`'d for planner use if you want it.

### CLI vs MCP

- **Subagents (MCP)**: use for the bounded plan → generate → heal loop.
  Token overhead is ~4× CLI but acceptable for structured sessions.
- **`playwright-cli` directly**: use for quick locator checks, app
  exploration, ad-hoc debugging. Saves snapshots to `.playwright-cli/`
  instead of streaming into the LLM context window (~4× fewer tokens).

```bash
playwright-cli open https://app.us.staging.signoz.cloud
playwright-cli snapshot              # element refs e1, e2, ...
playwright-cli fill e5 "term"
playwright-cli click e12
playwright-cli screenshot
playwright-cli console               # errors
playwright-cli network               # requests
playwright-cli state-save .playwright-cli/auth.json
playwright-cli close
```

For running and debugging test files, `yarn test:debug` / `yarn test:ui` /
`yarn codegen` are faster than MCP for simple cases.
