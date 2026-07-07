# Integration Tests

SigNoz uses integration tests to verify that different components work together correctly in a real environment. These tests run against actual services (ClickHouse, PostgreSQL, SigNoz, Zeus mock, Keycloak, etc.) spun up as containers, so suites exercise the same code paths production does.

## How to set up the integration test environment?

### Prerequisites

Before running integration tests, ensure you have the following installed:

- Python 3.13+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker (for containerized services)

### Initial Setup

1. Navigate to the shared tests project:
```bash
cd tests
```

2. Install dependencies using uv:
```bash
uv sync
```

> **_NOTE:_** the build backend could throw an error while installing `psycopg2`, please see https://www.psycopg.org/docs/install.html#build-prerequisites

### Starting the Test Environment

To spin up all the containers necessary for writing integration tests and keep them running:

```bash
make py-test-setup
```

Under the hood this runs, from `tests/`:

```bash
uv run pytest --basetemp=./tmp/ -vv --reuse integration/bootstrap/setup.py::test_setup
```

This command will:
- Start all required services (ClickHouse, PostgreSQL, Zookeeper, SigNoz, Zeus mock, gateway mock)
- Register an admin user
- Keep containers running via the `--reuse` flag

### Stopping the Test Environment

When you're done writing integration tests, clean up the environment:

```bash
make py-test-teardown
```

Which runs:

```bash
uv run pytest --basetemp=./tmp/ -vv --teardown integration/bootstrap/setup.py::test_teardown
```

This destroys the running integration test setup and cleans up resources.

## Understanding the Integration Test Framework

Python and pytest form the foundation of the integration testing framework. Testcontainers are used to spin up disposable integration environments. WireMock is used to spin up **test doubles** of external services (Zeus cloud API, gateway, etc.).

- **Why Python/pytest?** It's expressive, low-boilerplate, and has powerful fixture capabilities that make integration testing straightforward. Extensive libraries for HTTP requests, JSON handling, and data analysis (numpy) make it easier to test APIs and verify data.
- **Why testcontainers?** They let us spin up isolated dependencies that match our production environment without complex setup.
- **Why WireMock?** Well maintained, documented, and extensible.

```
tests/
├── conftest.py              # pytest_plugins registration
├── pyproject.toml
├── uv.lock
├── fixtures/                # shared fixture library (flat package)
│   ├── __init__.py
│   ├── auth.py              # admin/editor/viewer users, tokens, license
│   ├── clickhouse.py
│   ├── http.py              # WireMock helpers
│   ├── keycloak.py          # IdP container
│   ├── postgres.py
│   ├── signoz.py            # SigNoz-backend container
│   ├── sql.py
│   ├── types.py
│   └── ...                  # logs, metrics, traces, alerts, dashboards, ...
├── integration/
│   ├── bootstrap/
│   │   └── setup.py         # test_setup / test_teardown
│   ├── testdata/            # JSON / JSONL / YAML inputs per suite
│   └── tests/               # one directory per feature area
│       ├── alerts/
│       │   ├── 01_*.py      # numbered suite files
│       │   └── conftest.py  # optional suite-local fixtures
│       ├── auditquerier/
│       ├── cloudintegrations/
│       ├── dashboard/
│       ├── passwordauthn/
│       ├── querier/
│       └── ...
└── e2e/                     # Playwright suite (see docs/contributing/e2e.md)
```

Each test suite follows these principles:

1. **Organization**: Suites live under `tests/integration/tests/` in self-contained packages. Shared fixtures live in the top-level `tests/fixtures/` package so the e2e tree can reuse them.
2. **Execution Order**: Files are prefixed with two-digit numbers (`01_`, `02_`, `03_`) to ensure sequential execution when tests depend on ordering.
3. **Time Constraints**: Each suite should complete in under 10 minutes (setup takes ~4 mins).

### Test Suite Design

Test suites should target functional domains or subsystems within SigNoz. When designing a test suite, consider these principles:

- **Functional Cohesion**: Group tests around a specific capability or service boundary
- **Data Flow**: Follow the path of data through related components
- **Change Patterns**: Components frequently modified together should be tested together

The exact boundaries for suites are intentionally flexible, allowing contributors to define logical groupings based on their domain knowledge. Current suites cover alerts, audit querier, callback authn, cloud integrations, dashboards, ingestion keys, logs pipelines, password authn, preferences, querier, raw export data, roles, root user, service accounts, and TTL.

## How to write an integration test?

Now start writing an integration test. Create a new file `tests/integration/tests/bootstrap/01_version.py` and paste the following:

```python
import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_version(signoz: types.SigNoz) -> None:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/version"),
        timeout=2,
    )
    logger.info(response)
```

We have written a simple test which calls the `version` endpoint of the SigNoz backend. **To run just this function, run the following command:**

```bash
cd tests
uv run pytest --basetemp=./tmp/ -vv --reuse \
  integration/tests/bootstrap/01_version.py::test_version
```

> **Note:** The `--reuse` flag is used to reuse the environment if it is already running. Always use this flag when writing and running integration tests. Without it the environment is destroyed and recreated every run.

Here's another example of how to write a more comprehensive integration test:

```python
from http import HTTPStatus
import requests
from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_user_registration(signoz: types.SigNoz) -> None:
    """Test user registration functionality."""
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "testuser",
            "orgId": "",
            "orgName": "test.org",
            "email": "test@example.com",
            "password": "password123Z$",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True
```

Test inputs (JSON fixtures, expected payloads) go under `tests/integration/testdata/<suite>/` and are loaded via `fixtures.fs.get_testdata_file_path`.

## How to run integration tests?

### Running All Tests

```bash
make py-test
```

Which runs:

```bash
uv run pytest --basetemp=./tmp/ -vv integration/tests/
```

### Running Specific Test Categories

```bash
cd tests
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/<suite>/

# Run querier tests
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/querier/
# Run passwordauthn tests
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/passwordauthn/
```

### Running Individual Tests

```bash
uv run pytest --basetemp=./tmp/ -vv --reuse \
  integration/tests/<suite>/<file>.py::test_name

# Run test_register in 01_register.py in the passwordauthn suite
uv run pytest --basetemp=./tmp/ -vv --reuse \
  integration/tests/passwordauthn/01_register.py::test_register
```

## How to configure different options for integration tests?

Tests can be configured using pytest options:

- `--sqlstore-provider` — Choose the SQL store provider (default: `postgres`)
- `--sqlite-mode` — SQLite journal mode: `delete` or `wal` (default: `delete`). Only relevant when `--sqlstore-provider=sqlite`.
- `--postgres-version` — PostgreSQL version (default: `15`)
- `--clickhouse-version` — ClickHouse version (default: `25.5.6`)
- `--zookeeper-version` — Zookeeper version (default: `3.7.1`)
- `--schema-migrator-version` — SigNoz schema migrator version (default: `v0.144.2`)

Example:

```bash
uv run pytest --basetemp=./tmp/ -vv --reuse \
  --sqlstore-provider=postgres --postgres-version=14 \
  integration/tests/passwordauthn/
```

## What should I remember?

- **Always use the `--reuse` flag** when setting up the environment or running tests to keep containers warm. Without it every run rebuilds the stack (~4 mins).
- **Use the `--teardown` flag** only when cleaning up — mixing `--teardown` with `--reuse` is a contradiction.
- **Do not pre-emptively teardown before setup.** If the stack is partially up, `--reuse` picks up from wherever it is. `make py-test-teardown` then `make py-test-setup` wastes minutes.
- **Follow the naming convention** with two-digit numeric prefixes (`01_`, `02_`) for ordered test execution within a suite.
- **Use proper timeouts** in HTTP requests to avoid hanging tests (`timeout=5` is typical).
- **Clean up test data** between tests in the same suite to avoid interference — or rely on a fresh SigNoz container if you need full isolation.
- **Use descriptive test names** that clearly indicate what is being tested.
- **Leverage fixtures** for common setup. The shared fixture package is at `tests/fixtures/` — reuse before adding new ones.
- **Test both success and failure scenarios** (4xx / 5xx paths) to ensure robust functionality.
- **Run `make py-fmt` and `make py-lint` before committing** Python changes — black + isort + autoflake + pylint.
- **`--sqlite-mode=wal` does not work on macOS.** The integration test environment runs SigNoz inside a Linux container with the SQLite database file mounted from the macOS host. WAL mode requires shared memory between connections, and connections crossing the VM boundary (macOS host ↔ Linux container) cannot share the WAL index, resulting in `SQLITE_IOERR_SHORT_READ`. WAL mode is tested in CI on Linux only.
