# Integration tests

Backend integration tests run against a containerized SigNoz stack brought
up by pytest fixtures. Live under `tests/integration/`.

## Layout

```
tests/integration/
  bootstrap/setup.py     Stack lifecycle entrypoint (test_setup, test_teardown)
  tests/                 Suites, one dir per feature area
    <suite>/             e.g. alerts, dashboard, querier, role, ...
      NN_<name>.py       Numbered test files (collected in order)
  testdata/              JSON / JSONL / YAML data keyed by suite
```

## Running

From `signoz/`:

```bash
make py-test-setup      # warm up stack (keeps containers under --reuse)
make py-test            # run all integration suites
make py-test-teardown   # free containers
```

From `signoz/tests/`:

```bash
uv sync                                          # first time only
uv run pytest --basetemp=./tmp/ -vv --reuse integration/bootstrap/setup.py::test_setup
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/<suite>/<file>.py
```

Always pass `--reuse` — without it, pytest recreates containers on every
invocation.

## Conventions

- **Filenames**: `NN_<snake_name>.py` (e.g. `01_register.py`). The numeric
  prefix orders execution within a suite.
- **Suite directory**: one dir per feature area under `tests/`. Optionally
  `<suite>/conftest.py` for suite-local fixtures.
- **Fixtures**: shared ones live in `tests/fixtures/` (registered via
  `tests/conftest.py`'s `pytest_plugins`). Reuse before adding new.
- **Data**: test inputs / expected outputs live in `testdata/<suite>/`.
  Load via `fixtures.fs.get_testdata_file_path`.
- **Style**: black + pylint via `make py-fmt` and `make py-lint` before
  committing (run from repo root).

## Adding a suite

1. Create `tests/integration/tests/<suite>/` with an empty `__init__.py`.
2. Add `01_<entry>.py` with `test_<thing>(signoz: types.SigNoz)` functions.
3. Import shared fixtures directly (e.g.
   `from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD`).
4. If the suite needs bespoke setup, add `conftest.py` alongside the tests.
5. Put any test data under `testdata/<suite>/`.

Running a single test while iterating:

```bash
uv run pytest --basetemp=./tmp/ -vv --reuse \
  integration/tests/<suite>/<file>.py::test_<name>
```
