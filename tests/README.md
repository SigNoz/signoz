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
    bootstrap/setup.py     Brings backend up + seeder; writes .env.local
    bootstrap/run.py       One-command entrypoint: subprocesses `yarn test`
    tests/                 Playwright specs (TS)
    playwright.config.ts   Loads .env (user) + .env.local (generated) via dotenv
  seeder/                  HTTP service providing per-test telemetry endpoints
```

## Fixture ownership

- **Shared** (`tests/fixtures/`): anything that could be useful across trees —
  container bring-up, auth, direct telemetry inserts, API helpers.
- **No global pre-seed**: e2e specs seed their own data. Telemetry goes
  through the seeder's `/telemetry/{traces,logs,metrics}` endpoints;
  dashboards / alert rules / org config go through the SigNoz REST API
  directly from the spec.

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
