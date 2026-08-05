from collections.abc import Generator
from typing import Any

import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import register_admin
from fixtures.clickhouse import create_clickhouse_cluster
from fixtures.keeper import create_clickhouse_keeper
from fixtures.migrator import create_migrator
from fixtures.signoz import create_signoz


@pytest.fixture(name="keeper", scope="package")
def keeper_metricreduction(
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    return create_clickhouse_keeper(
        tmpfs=tmpfs,
        network=network,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="keeper_metricreduction",
    )


@pytest.fixture(name="clickhouse", scope="package")
def clickhouse_metricreduction(
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    keeper: types.TestContainerDocker,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerClickhouse:
    return create_clickhouse_cluster(
        tmpfs=tmpfs,
        network=network,
        keeper=keeper,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="clickhouse_metricreduction",
        shards=2,
    )


@pytest.fixture(name="migrator", scope="package")
def migrator_metricreduction(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.Operation:
    return create_migrator(
        network=network,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="migrator_metricreduction",
    )


@pytest.fixture(name="signoz", scope="package")
def signoz_metricreduction(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_metricreduction",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_ENABLE__METRICS__REDUCTION": True,
        },
    )


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin_metricreduction(signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.Operation:
    return register_admin(signoz, request, pytestconfig, cache_key="create_user_admin_metricreduction")
