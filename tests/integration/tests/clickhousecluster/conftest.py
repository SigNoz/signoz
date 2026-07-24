from collections.abc import Generator
from typing import Any

import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.clickhouse import create_clickhouse_cluster
from fixtures.keeper import create_clickhouse_keeper


@pytest.fixture(name="keeper", scope="package")
def keeper_cluster(
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
        cache_key="keeper_cluster",
    )


@pytest.fixture(name="clickhouse", scope="package")
def clickhouse_cluster(
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
        cache_key="clickhouse_cluster",
        shards=2,
    )
