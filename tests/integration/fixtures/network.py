import pytest
from testcontainers.core.container import Network


@pytest.fixture(scope="package")
def network(request: pytest.FixtureRequest) -> Network:
    """
    Package-Scoped fixture for creating a network
    """
    network = Network()
    network.create()

    def stop():
        network.remove()

    request.addfinalizer(stop)

    return network
