# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Playwright-based E2E suite for the SigNoz frontend, wired into the shared pytest project at `signoz/tests/`. Pytest fixtures (under `tests/fixtures/`) bring up the backend (ClickHouse + Postgres + migrator + SigNoz-with-web) and seed dashboards/alerts/telemetry before Playwright runs. Tests follow a test-plan-first workflow: write a markdown plan in `specs/`, then generate tests in `tests/`.

## Commands

```bash
# One-command local run (pytest owns lifecycle; shells out to Playwright):
cd signoz/tests && uv run pytest --basetemp=./tmp/ -vv --with-web \
  e2e/bootstrap/run.py::test_e2e

# Warm the backend for iterative dev (keeps containers under --reuse):
cd signoz/tests && uv run pytest --basetemp=./tmp/ -vv --reuse --with-web \
  e2e/bootstrap/setup.py::test_setup
# Then, from signoz/tests/e2e:
yarn install && yarn install:browsers    # first time only
yarn test                 # headless
yarn test:ui              # interactive
yarn test:headed          # headed
yarn test:debug           # step-through
yarn test tests/roles/roles-listing.spec.ts  # single file

# Staging fallback (skips all pytest lifecycle, hits remote env):
yarn test:staging

# Teardown the warm backend:
cd signoz/tests && uv run pytest --basetemp=./tmp/ -vv --teardown \
  e2e/bootstrap/setup.py::test_teardown

# Role-filtered runs (auto-set by global.setup.ts when backend is up):
SIGNOZ_USER_ROLE=Admin yarn test
SIGNOZ_USER_ROLE=Editor yarn test
SIGNOZ_USER_ROLE=Viewer yarn test

# Code quality (run before committing)
yarn typecheck
yarn lint:fix

# Reports
yarn report               # Open HTML report
yarn codegen              # Generate test code interactively
```

## Environment Variables

```bash
SIGNOZ_E2E_BASE_URL=https://app.us.staging.signoz.cloud
SIGNOZ_E2E_USERNAME=your-email@example.com
SIGNOZ_E2E_PASSWORD=your-password
SIGNOZ_USER_ROLE=Admin   # Admin | Editor | Viewer
```

## Architecture

```
specs/[feature]/[feature]-test-plan.md   # Markdown test plans (source of truth)
tests/[feature]/[feature].spec.ts        # Generated/implemented Playwright tests
tests/seed.spec.ts                       # Reference patterns — always cite as context
utils/login.util.ts                      # ensureLoggedIn() shared auth helper
examples/example-test-plan.md           # Template for new test plans
```

### Role Hierarchy

- `@viewer` — read-only tests (run for all roles)
- `@editor` — create/edit tests (run for Editor and Admin)
- `@admin` — delete/admin tests (run for Admin only)

`playwright.config.ts` automatically sets the grep filter based on `SIGNOZ_USER_ROLE`.

## Test File Structure

Every test file must follow this pattern:

```typescript
// spec: specs/[feature]/[feature]-test-plan.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { ensureLoggedIn } from '../../utils/login.util';

test.describe('[Feature Name]', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    // navigate to feature
  });

  test('[Test Name]', { tag: '@viewer' }, async ({ page }) => {
    // 1. Step description
    // 2. Step description
  });
});
```

## Locator Priority

Use in this order:
1. `getByRole('button', { name: 'Submit' })`
2. `getByLabel('Email')`
3. `getByPlaceholder('...')`
4. `getByText('...')`
5. `getByTestId('...')`
6. `locator('.ant-select')` — last resort (e.g., Ant Design dropdowns have no semantic alternative)

## Key Patterns

**Unique test data:** `const name = \`Test ${Date.now()}\`;`

**Explicit waits over timeouts:**
```typescript
// ✅ DO
await expect(page.getByRole('dialog')).toBeVisible();
// ❌ DON'T
await page.waitForTimeout(5000);
```

**Never commit `test.only` or untagged tests.**

## Playwright Agents

Two `--loop` targets are configured:

| Loop | Agents location | Use when |
|------|----------------|----------|
| `--loop=claude` | `.claude/agents/` | Working in Claude Code (this tool) |
| `--loop=vscode` | `.github/chatmodes/` | Working in VS Code Copilot |

**Re-run after every Playwright upgrade** to pick up improved prompts and new tools:
```bash
npx playwright init-agents --loop=claude
npx playwright init-agents --loop=vscode
```

Claude Code agents (in `.claude/agents/`):
- **playwright-test-planner** — explores the app and writes `specs/[feature]/test-plan.md`
- **playwright-test-generator** — reads a test plan, executes steps live, writes `tests/[feature]/[feature].spec.ts`
- **playwright-test-healer** — runs failing tests, debugs, patches locators/waits until green

These agents use MCP (`run-test-mcp-server --headless`) for bounded, structured test generation sessions.

## CLI vs MCP: When to Use What

**Use the Playwright subagents (MCP)** for the structured plan → generate → heal workflow. Each session is bounded so the MCP token overhead (~4x vs CLI) is acceptable.

**Use `playwright-cli` directly** for all other browser work — quick locator checks, exploring the app, debugging outside a structured session. It saves snapshots/screenshots to disk (`.playwright-cli/`) instead of streaming them into the context window, giving ~4x token savings vs MCP.

```bash
# Open the app and take a snapshot (element refs saved to .playwright-cli/*.yml)
playwright-cli open https://app.us.staging.signoz.cloud

# Get compact element refs (e1, e2, ...) without sending the DOM into context
playwright-cli snapshot

# Interact using refs from the snapshot
playwright-cli fill e5 "search term"
playwright-cli click e12
playwright-cli press Enter

# Each action also outputs the equivalent Playwright code — copy straight into tests
# e.g.: await page.getByRole('button', { name: 'Submit' }).click();

# Take a screenshot (saved to disk, not injected into context)
playwright-cli screenshot

# Check console errors and network requests
playwright-cli console
playwright-cli network

# Save and restore auth state (skip login in subsequent sessions)
playwright-cli state-save .playwright-cli/auth.json
playwright-cli state-load .playwright-cli/auth.json

playwright-cli close
```

For running and debugging actual test files, use these (they're faster for simple cases):

```bash
yarn test tests/[feature]/[feature].spec.ts   # run single spec
yarn test:debug tests/[feature]/[feature].spec.ts  # step-through
yarn test:ui                                   # interactive UI
yarn codegen                                   # record a flow interactively
```
