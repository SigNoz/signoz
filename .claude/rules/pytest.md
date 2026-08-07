---
paths:
  - "tests/**/*.py"
---

# pytest conventions

For the Python integration suite under `tests/`. Setup, running, and suite layout live in [`docs/contributing/tests/integration.md`](../../docs/contributing/tests/integration.md).

- **No module-level `_helper()` functions.** Inline the logic into the test body — a reader should see what a test does without chasing private helpers, which scatter a test's meaning across the file. Prefer inline expressions, comprehensions, lists of `ids`, and pytest fixtures over `_`-prefixed functions. Extract a helper only when it's **genuinely non-trivial and reused across many tests**, or when explicitly asked.
- **Reuse the shared fixture package before writing anything new.** `tests/fixtures/` is the shared library (auth, signoz, clickhouse, logs/metrics/traces seeding, …). A fixture needed by one suite goes in that suite's `conftest.py`; promote it to `tests/fixtures/` when a second suite needs it.
- **Fixtures own their cleanup.** When a test needs seeded state, put the seed + cleanup pair in a fixture (`yield`, then tear down) so tests in the same suite don't interfere — the pattern `insert_metrics` sets: yield a callable, truncate on teardown.
- **Fixture-factory over indirect parametrization.** A fixture that yields a callable (e.g. `insert_metrics(metrics)`) is clearer than `@pytest.mark.parametrize(..., indirect=True)` + `request.param` — the value is an explicit argument, not resolved by magic.
- **Skip at collection, not inside the test body.** Use `pytest.param(..., marks=pytest.mark.skip(reason="…"))` so a skipped case shows as SKIPPED-with-reason **and** short-circuits before its fixtures run (no environment spin-up for a test that won't execute).
- **Test config comes from explicit `--flags`, not the environment.** Wire configuration as pytest options declared in `tests/conftest.py` (`pytest_addoption` — e.g. `--sqlstore-provider`, `--clickhouse-version`); do **not** add `os.environ` fallbacks inside tests or fixtures.
- **snake_case parametrize ids.** `ids=["fill_gaps", "fill_zero"]`, not camelCase.

## Gotchas

- **A file that doesn't match `python_files` is silently never collected.** `pyproject.toml` restricts collection to `[0-9][0-9]_*.py` (plus the bootstrap `setup.py` / `run.py`) — name suite files with the two-digit prefix or pytest skips them without a word.
- **`--import-mode=importlib` is what allows same-basename files across suites** (`querier/01_logs.py` vs `rawexportdata/01_logs.py`); it also disables pytest's implicit `sys.path` injection, so `import fixtures` resolves via `pythonpath = ["."]` — always run from `tests/`.
