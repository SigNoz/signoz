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
    "fixtures.audit",
    "fixtures.logs",
    "fixtures.traces",
    "fixtures.metrics",
    "fixtures.meter",
    "fixtures.browser",
    "fixtures.keycloak",
    "fixtures.idp",
    "fixtures.notification_channel",
    "fixtures.alerts",
    "fixtures.cloudintegrations",
    "fixtures.jsontypes",
    "fixtures.seeder",
    "fixtures.serviceaccount",
    "fixtures.role",
]


def pytest_addoption(parser: pytest.Parser):
    parser.addoption(
        "--reuse",
        action="store_true",
        default=False,
        help="Reuse environment. Use pytest --basetemp=./tmp/ -vv --reuse src/bootstrap/setup::test_setup to setup your local dev environment for writing tests.",
    )
    parser.addoption(
        "--teardown",
        action="store_true",
        default=False,
        help="Teardown environment. Run pytest --basetemp=./tmp/ -vv --teardown src/bootstrap/setup::test_teardown to teardown your local dev environment.",
    )
    parser.addoption(
        "--with-web",
        action="store_true",
        default=False,
        help="Build and run with web. Run pytest --basetemp=./tmp/ -vv --with-web src/bootstrap/setup::test_setup to setup your local dev environment with web.",
    )
    parser.addoption(
        "--sqlstore-provider",
        action="store",
        default="postgres",
        help="sqlstore provider",
    )
    parser.addoption(
        "--sqlite-mode",
        action="store",
        default="delete",
        help="sqlite mode",
    )
    parser.addoption(
        "--sqlite-transaction-mode",
        action="store",
        default="deferred",
        help="sqlite transaction mode",
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
        default="25.5.6",
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
        default="v0.144.3",
        help="schema migrator version",
    )
