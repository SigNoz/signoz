# SigNoz Tests

Shared pytest project with two test trees that reuse the same fixture graph.

```
tests/
  pyproject.toml           Shared uv/pytest project (rootdir for both trees)
  conftest.py              Registers pytest_plugins from fixtures/
  fixtures/                Shared Python fixtures: container bring-up, auth,
                           telemetry inserts, API-seeding helpers
  integration/
    bootstrap/setup.py     Brings backend up (stack lifecycle for iterative dev)
    tests/                 Backend integration tests (pytest)
    testdata/              Integration-specific JSON/YAML
  e2e/
    bootstrap/setup.py     Brings backend up + seeds; writes .signoz-backend.json
    bootstrap/run.py       One-command entrypoint: subprocesses `yarn test`
    conftest.py            e2e-scoped fixtures (seed_dashboards, seed_e2e_telemetry)
    tests/                 Playwright specs (TS)
    testdata/              e2e-specific JSON (dashboards, alerts, channels)
    playwright.config.ts   baseURL reads from env injected by global.setup.ts
    global.setup.ts        Reads .signoz-backend.json, sets env vars
```

## Fixture ownership

- **Shared** (`tests/fixtures/`): anything that could be useful across trees —
  container bring-up, auth, direct telemetry inserts, API helpers.
- **Per-tree** (`tests/<tree>/conftest.py`): fixtures whose payloads are
  tree-specific (e.g. e2e dashboard JSONs live in `tests/e2e/testdata/`,
  loaded by `seed_dashboards` declared in `tests/e2e/conftest.py`).

Testdata follows the same rule — JSON/YAML lives next to the tests that own it.

## Common commands

```bash
# From signoz/:
make py-test                  # Run all integration tests
make py-test-setup             # Warm up backend (for iterative dev)
make py-test-teardown          # Free containers

# From signoz/tests/:
uv sync                                          # First-time Python deps
uv run pytest integration/tests/                 # Integration suite
uv run pytest --with-web e2e/bootstrap/run.py::test_e2e   # Full e2e run
```

See `e2e/README.md` for the e2e-specific workflow.
