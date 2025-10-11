# SigNoz Frontend Automation

E2E tests for SigNoz frontend using Playwright.

## Setup

```bash
# Install dependencies
yarn install

# Install Playwright browsers
yarn install:browsers

# Copy .env.example to .env and configure
cp .env.example .env
# Edit .env with your test credentials
```

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
```

## Using Playwright Agents with Cursor

### 🎭 Planner - Create Test Plans

**In Cursor Chat:**
```
@.github/chatmodes/ 🎭 planner.chatmode.md @tests/seed.spec.ts

Follow the planner instructions to create a comprehensive test plan for [feature name]
Save to: specs/[feature-name].md
```

The planner will:
- Use your seed test for context
- Explore the application
- Create a detailed test plan in `specs/[feature].md`

### 🎭 Generator - Generate Tests

**In Cursor Chat:**
```
@.github/chatmodes/🎭 generator.chatmode.md @specs/[feature].md @tests/seed.spec.ts

Follow the generator instructions to generate Playwright tests from the test plan
Save to: tests/[feature]/
```

The generator will:
- Read the test plan
- Create test files in `tests/[feature]/`
- Use proper locators and assertions
- Follow seed.spec.ts patterns

### 🎭 Healer - Fix Failing Tests

**In Cursor Chat:**
```
@.github/chatmodes/🎭 healer.chatmode.md @tests/[feature]/[test].spec.ts

Follow the healer instructions to fix the failing test: [test name]
Error: [paste error message]
```

The healer will:
- Replay failing steps
- Update locators if needed
- Add proper waits
- Re-run until passing

## Directory Structure

```
frontend_automation/
├── .github/
│   └── chatmodes/              # Playwright agent definitions
│       ├──  🎭 planner.chatmode.md
│       ├── 🎭 generator.chatmode.md
│       └── 🎭 healer.chatmode.md
├── .vscode/
│   └── mcp.json               # MCP server config
├── specs/                     # Test plans (Markdown)
│   └── example-test-plan.md
├── tests/                     # Test files (.spec.ts)
│   └── seed.spec.ts
├── utils/                     # Utilities and helpers
│   └── login.util.ts
├── .env                       # Environment variables (git-ignored)
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── playwright.config.ts       # Playwright configuration
├── tsconfig.json              # TypeScript configuration
├── yarn.lock                  # Yarn lock file
└── README.md
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SIGNOZ_E2E_BASE_URL` | Base URL of the application | `https://app.us.staging.signoz.cloud` |
| `SIGNOZ_E2E_USERNAME` | Test user email | `test@example.com` |
| `SIGNOZ_E2E_PASSWORD` | Test user password | `your-password` |
| `SIGNOZ_E2E_API_URL` | API endpoint (optional) | `https://api.us.staging.signoz.cloud` |

## Workflow Example

### Complete Test Creation Flow

```bash
# 1. In Cursor Chat, create test plan
@.github/chatmodes/ 🎭 planner.chatmode.md @tests/seed.spec.ts

Create a test plan for: routing policies feature
Save to: specs/routing-policies.md

# 2. Review the generated plan in specs/routing-policies.md
# Edit if needed

# 3. Generate tests from the plan
@.github/chatmodes/🎭 generator.chatmode.md @specs/routing-policies.md @tests/seed.spec.ts

Generate tests and save to: tests/routing-policies/

# 4. Run the tests
yarn test:ui

# 5. If any test fails, heal it
@.github/chatmodes/🎭 healer.chatmode.md @tests/routing-policies/[failing-test].spec.ts

Fix the failing test

# 6. Re-run to verify
yarn test
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'yarn'
          
      - name: Install dependencies
        run: yarn install
        working-directory: frontend_automation
        
      - name: Install Playwright browsers
        run: yarn install:browsers
        working-directory: frontend_automation
        
      - name: Run tests
        run: yarn test
        working-directory: frontend_automation
        env:
          SIGNOZ_E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
          SIGNOZ_E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          SIGNOZ_E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
          
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend_automation/playwright-report/
          retention-days: 30
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

### Agents Not Working in Cursor
- Ensure you're using `@` to reference chatmode files
- Include seed test in context
- Follow the agent instructions explicitly

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

## License

MIT

