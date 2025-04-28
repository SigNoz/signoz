import pytest

pytest_plugins = [
    "fixtures.auth",
    "fixtures.clickhouse",
    "fixtures.fs",
    "fixtures.http",
    "fixtures.migrator",
    "fixtures.network",
    "fixtures.postgres",
    "fixtures.sql",
    "fixtures.sqlite",
    "fixtures.zookeeper",
    "fixtures.signoz",
]


def pytest_addoption(parser: pytest.Parser):
    parser.addoption(
        "--dev",
        action="store",
        default=False,
        help="Run in dev mode. In this mode, the containers are not torn down after test run and are reused in subsequent test runs.",
    )
    parser.addoption(
        "--sqlstore-provider",
        action="store",
        default="postgres",
        help="sqlstore provider",
    )
    parser.addoption(
        "--postgres-version",
        action="store",
        default="15",
        help="postgres version",
    )
    parser.addoption(
        "--clickhouse-version",
        action="store",
        default="24.1.2-alpine",
        help="clickhouse version",
    )
    parser.addoption(
        "--zookeeper-version",
        action="store",
        default="3.7.1",
        help="zookeeper version",
    )
    parser.addoption(
        "--schema-migrator-version",
        action="store",
        default="v0.111.38",
        help="schema migrator version",
    )
