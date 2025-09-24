# Integration Tests

SigNoz uses integration tests to verify that different components work together correctly in a real environment. These tests run against actual services (ClickHouse, PostgreSQL, etc.) to ensure end-to-end functionality.

## How to set up the integration test environment?

### Prerequisites

Before running integration tests, ensure you have the following installed:

- Python 3.13+
- Poetry (for dependency management)
- Docker (for containerized services)

### Initial Setup

1. Navigate to the integration tests directory:
```bash
cd tests/integration
```

2. Install dependencies using Poetry:
```bash
poetry install --no-root
```

### Starting the Test Environment

To spin up all the containers necessary for writing integration tests and keep them running:

```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse src/bootstrap/setup.py::test_setup
```

This command will:
- Start all required services (ClickHouse, PostgreSQL, Zookeeper, etc.)
- Keep containers running due to the `--reuse` flag
- Verify that the setup is working correctly

### Stopping the Test Environment

When you're done writing integration tests, clean up the environment:

```bash
poetry run pytest --basetemp=./tmp/ -vv --teardown -s src/bootstrap/setup.py::test_teardown
```

This will destroy the running integration test setup and clean up resources.

## Understanding the Integration Test Framework

Python and pytest form the foundation of the integration testing framework. Testcontainers are used to spin up disposable integration environments. Wiremock is used to spin up **test doubles** of other services.

- **Why Python/pytest?** It's expressive, low-boilerplate, and has powerful fixture capabilities that make integration testing straightforward. Extensive libraries for HTTP requests, JSON handling, and data analysis (numpy) make it easier to test APIs and verify data
- **Why testcontainers?** They let us spin up isolated dependencies that match our production environment without complex setup.
- **Why wiremock?** Well maintained, documented and extensible.

```
.
├── conftest.py
├── fixtures
│   ├── __init__.py
│   ├── auth.py
│   ├── clickhouse.py
│   ├── fs.py
│   ├── http.py
│   ├── migrator.py
│   ├── network.py
│   ├── postgres.py
│   ├── signoz.py
│   ├── sql.py
│   ├── sqlite.py
│   ├── types.py
│   └── zookeeper.py
├── poetry.lock
├── pyproject.toml
└── src
    └── bootstrap
        ├── __init__.py
        ├── a_database.py
        ├── b_register.py
        └── c_license.py
```

Each test suite follows some important principles:

1. **Organization**: Test suites live under `src/` in self-contained packages. Fixtures (a pytest concept) live inside `fixtures/`.
2. **Execution Order**: Files are prefixed with `a_`, `b_`, `c_` to ensure sequential execution.
3. **Time Constraints**: Each suite should complete in under 10 minutes (setup takes ~4 mins).

### Test Suite Design

Test suites should target functional domains or subsystems within SigNoz. When designing a test suite, consider these principles:

- **Functional Cohesion**: Group tests around a specific capability or service boundary
- **Data Flow**: Follow the path of data through related components
- **Change Patterns**: Components frequently modified together should be tested together

The exact boundaries for modules are intentionally flexible, allowing teams to define logical groupings based on their specific context and knowledge of the system.

Eg: The **bootstrap** integration test suite validates core system functionality:

- Database initialization
- Version check

Other test suites can be **pipelines, auth, querier.**

## How to write an integration test?

Now start writing an integration test. Create a new file `src/bootstrap/e_version.py` and paste the following:

```python
import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

def test_version(signoz: types.SigNoz) -> None:
    response = requests.get(signoz.self.host_config.get("/api/v1/version"), timeout=2)
    logger.info(response)
```

We have written a simple test which calls the `version` endpoint of the container in step 1. In **order to just run this function, run the following command:**

```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse src/bootstrap/e_version.py::test_version
```

> Note: The `--reuse` flag is used to reuse the environment if it is already running. Always use this flag when writing and running integration tests. If you don't use this flag, the environment will be destroyed and recreated every time you run the test.

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

## How to run integration tests?

### Running All Tests

```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse src/
```

### Running Specific Test Categories

```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse src/<suite>

# Run querier tests
poetry run pytest --basetemp=./tmp/ -vv --reuse src/querier/
# Run auth tests
poetry run pytest --basetemp=./tmp/ -vv --reuse src/auth/
```

### Running Individual Tests

```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse src/<suite>/<file>.py::test_name

# Run test_register in file a_register.py in auth suite
poetry run pytest --basetemp=./tmp/ -vv --reuse src/auth/a_register.py::test_register
```

## How to configure different options for integration tests?

Tests can be configured using pytest options:

- `--sqlstore-provider` - Choose database provider (default: postgres)
- `--postgres-version` - PostgreSQL version (default: 15)
- `--clickhouse-version` - ClickHouse version (default: 25.5.6)
- `--zookeeper-version` - Zookeeper version (default: 3.7.1)

Example:
```bash
poetry run pytest --basetemp=./tmp/ -vv --reuse --sqlstore-provider=postgres --postgres-version=14 src/auth/
```


## What should I remember?

- **Always use the `--reuse` flag** when setting up the environment to keep containers running
- **Use the `--teardown` flag** when cleaning up to avoid resource leaks
- **Follow the naming convention** with alphabetical prefixes for test execution order
- **Use proper timeouts** in HTTP requests to avoid hanging tests
- **Clean up test data** between tests to avoid interference
- **Use descriptive test names** that clearly indicate what is being tested
- **Leverage fixtures** for common setup and authentication
- **Test both success and failure scenarios** to ensure robust functionality
