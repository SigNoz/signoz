# SigNoz E2E

Playwright tests for the SigNoz frontend. Lives alongside
`tests/integration/` and reuses the pytest fixture graph to bring up a
containerized backend, register an admin, and seed
dashboards/alerts/telemetry before Playwright runs.

Full contributor guide (layout, workflow, AI-assisted test authoring):
[`docs/contributing/tests/e2e.md`](../../docs/contributing/tests/e2e.md).

## Quick start

```bash
# One-command local run
cd signoz/tests
uv sync
uv run pytest --basetemp=./tmp/ -vv --with-web \
  e2e/bootstrap/run.py::test_e2e

# Iterative dev (backend stays warm)
cd signoz/tests
uv run pytest --basetemp=./tmp/ -vv --reuse --with-web \
  e2e/bootstrap/setup.py::test_setup
cd e2e
yarn install && yarn install:browsers   # first time only
yarn test:ui
```

## Common commands

```bash
yarn test                   # headless
yarn test:ui                # interactive UI
yarn test:headed            # with browser
yarn test:debug             # step-through debugger
yarn test:staging           # remote staging env (skip pytest lifecycle)
yarn test tests/<feature>/<file>.spec.ts   # single file

yarn lint:fix
yarn typecheck

yarn report                 # open HTML report
yarn codegen                # record a flow interactively
```

## Staging fallback

```bash
cp .env.example .env   # fill SIGNOZ_E2E_USERNAME, SIGNOZ_E2E_PASSWORD
yarn test:staging
```
