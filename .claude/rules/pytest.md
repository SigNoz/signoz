---
paths:
  - "tests/**/*.py"
---

# pytest conventions

For the Python integration suite under `tests/`. Setup, running, and suite layout live in [`docs/contributing/tests/integration.md`](../../docs/contributing/tests/integration.md).

- **No `_`-prefixed helper functions in test modules — this is the rule that matters most.** A reader must be able to see what a test does in its body alone, without chasing private helpers that scatter the meaning across the file. Inline the logic: an expression, a comprehension, a few repeated lines are all fine — repetition across tests is cheaper than indirection. When several tests genuinely share non-trivial setup or assertions, that is what fixtures are for — in `tests/fixtures/`, see the next rule. A module-level `_helper()` is never the answer.
- **Fixtures live in `tests/fixtures/` — never under `integration/tests/`.** Not in test modules, not in suite `conftest.py` files. `tests/fixtures/` is the shared library (auth, signoz, clickhouse, logs/metrics/traces seeding, …): reuse what's there before writing anything new; when a new fixture is genuinely needed, add it to the matching `tests/fixtures/` module and register new modules in `tests/conftest.py` `pytest_plugins`. **The one exception: SigNoz-level fixtures in a suite's `conftest.py`.** A suite that needs its own SigNoz spun up with different envs (`create_signoz`/`create_migrator` with `env_overrides` + `cache_key` — e.g. basepath, metricreduction, querier_json_body) keeps that in its `conftest.py`; that is always okay.
- **Fixtures own their cleanup.** When a test needs seeded state, put the seed + cleanup pair in a fixture (`yield`, then tear down) so tests in the same suite don't interfere — the pattern `insert_metrics` sets: yield a callable, truncate on teardown.
- **Fixture-factory over indirect parametrization.** A fixture that yields a callable (e.g. `insert_metrics(metrics)`) is clearer than `@pytest.mark.parametrize(..., indirect=True)` + `request.param` — the value is an explicit argument, not resolved by magic.
- **Skip at collection, not inside the test body.** Use `pytest.param(..., marks=pytest.mark.skip(reason="…"))` so a skipped case shows as SKIPPED-with-reason **and** short-circuits before its fixtures run (no environment spin-up for a test that won't execute).
- **Test config comes from explicit `--flags`, not the environment.** Wire configuration as pytest options declared in `tests/conftest.py` (`pytest_addoption` — e.g. `--sqlstore-provider`, `--clickhouse-version`); do **not** add `os.environ` fallbacks inside tests or fixtures.
- **snake_case parametrize ids.** `ids=["fill_gaps", "fill_zero"]`, not camelCase.
- **Name suite files with the two-digit prefix (`NN_*.py`).** `pyproject.toml` restricts collection to `[0-9][0-9]_*.py` (plus the bootstrap `setup.py` / `run.py`) — a file that doesn't match is silently never collected.
- **Always run pytest from `tests/`.** `--import-mode=importlib` is what allows same-basename files across suites (`querier/01_logs.py` vs `rawexportdata/01_logs.py`), but it disables pytest's implicit `sys.path` injection — `import fixtures` only resolves via `pythonpath = ["."]` from that rootdir.
