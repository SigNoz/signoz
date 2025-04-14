import pytest

pytest_plugins = [
    "fixtures.fs",
    "fixtures.http",
    "fixtures.network",
    "fixtures.sqlite",
    "fixtures.postgres",
    "fixtures.sql",
    "fixtures.clickhouse",
    "fixtures.signoz",
]


def pytest_addoption(parser: pytest.Parser):
    parser.addoption(
        "--env",
        action="store",
        default="conftest.env",
        help="file containing env of signoz",
    )
    parser.addoption(
        "--postgres-version", action="store", default="15", help="postgres version"
    )
    parser.addoption(
        "--clickhouse-version",
        action="store",
        default="24.1.2-alpine",
        help="clickhouse version",
    )
    parser.addoption(
        "--schema-migrator-version",
        action="store",
        default="v0.111.38",
        help="schema migrator version",
    )
