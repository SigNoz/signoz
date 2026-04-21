# SigNoz E2E

Playwright tests for the SigNoz frontend. Lives alongside `tests/integration/` and reuses its pytest fixture graph to bring up a containerized backend, register an admin, and seed dashboards + telemetry before Playwright runs.

## Two ways to run

### 1. One-command (local backend, recommended)

Pytest owns the lifecycle. It provisions containers, registers the admin, seeds dashboards/alerts/telemetry, writes backend coordinates to `.signoz-backend.json`, then shells out to `yarn test`:

```bash
cd signoz/tests
uv sync                                               # first time only
uv run pytest --basetemp=./tmp/ -vv --with-web \
  e2e/bootstrap/run.py::test_e2e
```

For iterative Playwright dev, bring the backend up once (`--reuse` keeps containers warm) and drive Playwright directly:

```bash
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --reuse --with-web \
  e2e/bootstrap/setup.py::test_setup
cd e2e && yarn install && yarn install:browsers       # first time
yarn test:ui                                          # iterate
```

Teardown when done:

```bash
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --teardown \
  e2e/bootstrap/setup.py::test_teardown
```

### 2. Staging fallback

Point `SIGNOZ_E2E_BASE_URL` at a remote env (e.g. staging) — `global.setup.ts` becomes a no-op and Playwright hits the URL directly:

```bash
cp .env.example .env              # fill SIGNOZ_E2E_USERNAME/PASSWORD
yarn test:staging
```

## Setup details

```bash
# Install dependencies (local deps for Playwright)
yarn install

# Install Playwright browsers
yarn install:browsers

# Copy .env.example to .env (only needed for staging mode)
cp .env.example .env
```

### Playwright CLI Setup (token-efficient browser automation)

`@playwright/cli` is a standalone CLI tool for AI coding agents. It saves snapshots and screenshots to disk instead of streaming them into the LLM context — ~4x fewer tokens than MCP for open-ended browser sessions.

```bash
yarn install:cli
# Equivalent to:
#   npm install -g @playwright/cli@latest
#   playwright-cli install --skills
```

This initializes the workspace and installs the `SKILL.md` to `.claude/skills/playwright-cli/` so Claude Code can use `playwright-cli` commands directly.

> **Note:** Re-run `yarn install:cli` after upgrading `@playwright/cli` to pick up new commands and skill definitions.

### Playwright Agents Setup

Initialize Playwright agents for your AI tool:

```bash
# For Claude Code
npx playwright init-agents --loop=claude

# For VS Code Copilot
npx playwright init-agents --loop=vscode
```

> **Note:** Re-run these commands after every Playwright version upgrade to pick up improved agent prompts and new tools.

This creates three agents:
1. **Planner** - Explores the app and creates comprehensive test plans in `specs/`
2. **Generator** - Generates Playwright tests from test plans in `specs/`
3. **Healer** - Fixes failing tests by updating locators and adding proper waits

The MCP server (`.mcp.json`) runs in `--headless` mode to avoid spawning a visible browser window during agent sessions.

The agents are configured to work with your `seed.spec.ts` file for context and patterns.

## Running Tests

```bash
# Run all tests
yarn test

# Run in UI mode (interactive)
yarn test:ui

# Run in headed mode (see browser)
yarn test:headed

# Debug mode
yarn test:debug

# Run specific browser
yarn test:chromium
yarn test:firefox
yarn test:webkit

# View HTML report
yarn report

# Generate tests with Codegen
yarn codegen

# Linting and formatting
yarn lint
yarn lint:fix

# Type checking
yarn typecheck
```

## Using Playwright Agents

The agent invocation syntax differs by AI tool:

### Claude Code

```
use playwright-test-planner to create a test plan for [feature] at [url]
save to: specs/[feature]/[feature]-test-plan.md

use playwright-test-generator with specs/[feature]/[feature]-test-plan.md and tests/seed.spec.ts
save to: tests/[feature]/[feature].spec.ts

use playwright-test-healer to fix failing tests in tests/[feature]/[feature].spec.ts
error: [paste error message]
```

### VS Code Copilot

```
@🎭 planner @tests/seed.spec.ts
Create a test plan for [feature]. Save to: specs/[feature]/[feature]-test-plan.md

@🎭 generator @specs/[feature]/[feature]-test-plan.md @tests/seed.spec.ts
Generate tests. Save to: tests/[feature]/[feature].spec.ts

@🎭 healer @tests/[feature]/[test].spec.ts
Fix the failing test: [test name]. Error: [paste error message]
```

### What each agent does

| Agent | Input | Output |
|-------|-------|--------|
| Planner | App URL + seed test | `specs/[feature]/test-plan.md` |
| Generator | Test plan + seed test | `tests/[feature]/[feature].spec.ts` (validated live) |
| Healer | Failing `.spec.ts` + error | Patched test, or `test.fixme()` with explanation |



## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SIGNOZ_E2E_BASE_URL` | Base URL of the application | `https://app.us.staging.signoz.cloud` |
| `SIGNOZ_E2E_USERNAME` | Test user email | `test@example.com` |
| `SIGNOZ_E2E_PASSWORD` | Test user password | `your-password` |
| `SIGNOZ_USER_ROLE` | Role of the user for testing | `Admin`, `Editor`, or `Viewer` |

## Workflow Example

### Complete Test Creation Flow (Claude Code)

```bash
# 1. Create test plan
# In Claude Code, say:
# "use playwright-test-planner to create a test plan for the routing policies feature at https://app.us.staging.signoz.cloud/alerts
#  save to: specs/alerts/routing-policies-test-plan.md"

# 2. Review and edit the generated plan in specs/alerts/routing-policies-test-plan.md

# 3. Generate tests from the plan
# "use playwright-test-generator with specs/alerts/routing-policies-test-plan.md and tests/seed.spec.ts
#  save to: tests/alerts/routing-policies.spec.ts"

# 4. Run the tests
yarn test:ui

# 5. If any test fails, heal it
# "use playwright-test-healer to fix failing tests in tests/alerts/routing-policies.spec.ts
#  error: <paste error output>"

# 6. Re-run to verify
yarn test
```

### Role-Based Test Execution

This project uses Playwright's tag system to run tests based on user roles. Tests are automatically filtered by the `SIGNOZ_USER_ROLE` environment variable.

#### How It Works

When you run tests, Playwright automatically filters which tests execute based on your role:

- **Admin**: Runs ALL tests (has access to everything)
- **Editor**: Runs Editor + Viewer tests (cannot run Admin-only features)
- **Viewer**: Runs only Viewer tests (read-only access)

#### Tagging Tests

When writing tests, tag them based on required permissions:

```typescript
// Admin-only test
test(
  'Delete Organization',
  { tag: '@admin' },
  async ({ page }) => {
    // Only admins can delete organizations
  }
);

// Editor-level test
test(
  'Create Dashboard',
  { tag: '@editor' },
  async ({ page }) => {
    // Editors and Admins can create dashboards
  }
);

// Viewer-level test
test(
  'View Dashboard',
  { tag: '@viewer' },
  async ({ page }) => {
    // All users can view dashboards
  }
);
```

#### Running Tests

```bash
# Run tests as different roles
SIGNOZ_USER_ROLE=Admin yarn test     # Runs @admin, @editor, @viewer tests
SIGNOZ_USER_ROLE=Editor yarn test    # Runs @editor, @viewer tests only
SIGNOZ_USER_ROLE=Viewer yarn test    # Runs @viewer tests only

# Set role in .env file for persistent testing
echo "SIGNOZ_USER_ROLE=Admin" >> .env
yarn test
```

## Best Practices

1. **Start with Seed Test** - Always reference `seed.spec.ts` for patterns
2. **Review Generated Plans** - Edit test plans before generating tests
3. **Use Semantic Locators** - Prefer `getByRole`, `getByLabel` over CSS selectors
4. **Keep Plans Updated** - Update `specs/` when features change
5. **Let Healer Work** - The healer can fix most locator and timing issues
6. **Write Descriptive Tests** - Use clear test names and comments

## Troubleshooting

### Tests Won't Run
- Check `.env` has correct credentials
- Verify `baseURL` is accessible
- Run `yarn test:debug` for detailed output

### Locators Failing
- Use the healer agent to fix them
- Or use Playwright Inspector: `yarn test:debug`
- Check if UI elements have changed

### Authentication Issues
- Verify `ensureLoggedIn()` function works
- Check credentials in `.env`
- Run seed test independently: `yarn test tests/seed.spec.ts`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Agents](https://playwright.dev/docs/test-agents)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Contributing

When adding new tests:
1. Create a test plan in `specs/` first
2. Use agents to generate tests
3. Review and refine generated code
4. Ensure tests follow existing patterns
5. Add proper documentation
