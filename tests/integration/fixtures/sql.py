import pytest

from fixtures import types


@pytest.fixture(name="sqlstore", scope="package")
def sqlstore(
    request: pytest.FixtureRequest,
) -> types.TestContainerSQL:
    """
    Packaged-scoped fixture for creating sql store.
    """
    provider = request.config.getoption("--sqlstore-provider")

    if provider == "postgres":
        store = request.getfixturevalue("postgres")
        return store
    if provider == "sqlite":
        store = request.getfixturevalue("sqlite")
        return store

    raise pytest.FixtureLookupError(
        argname=f"{provider}",
        request=request,
        msg=f"{provider} does not have a fixture",
    )
