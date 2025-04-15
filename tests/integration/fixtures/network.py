import pytest
from testcontainers.core.container import Network


@pytest.fixture(name="network", scope="package")
def network(request: pytest.FixtureRequest) -> Network:
    """
    Package-Scoped fixture for creating a network
    """
    nw = Network()
    nw.create()

    def stop():
        nw.remove()

    request.addfinalizer(stop)

    return nw
