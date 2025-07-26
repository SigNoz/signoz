from typing import Callable, TypeVar

import pytest

from fixtures.logger import setup_logger

logger = setup_logger(__name__)

T = TypeVar("T")


def reuse(request: pytest.FixtureRequest) -> bool:
    return request.config.getoption("--reuse")


def teardown(request: pytest.FixtureRequest) -> bool:
    return request.config.getoption("--teardown")


def get_cached_resource(pytestconfig: pytest.Config, key: str):
    """Get a resource from pytest cache by key."""
    return pytestconfig.cache.get(key, None)


def set_cached_resource(pytestconfig: pytest.Config, key: str, value):
    """Set a resource in pytest cache by key."""
    pytestconfig.cache.set(key, value)


def remove_cached_resource(pytestconfig: pytest.Config, key: str):
    """Remove a resource from pytest cache by key (set to None)."""
    pytestconfig.cache.set(key, None)


def wrap(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    key: str,
    empty: Callable[[], T],
    create: Callable[[], T],
    delete: Callable[[T], None],
    restore: Callable[[dict], T],
) -> T:
    """
    Wraps a resource creation and cleanup process with reuse and teardown options.
    - request: pytest.FixtureRequest
    - pytestconfig: pytest.Config
    - key: cache key for the resource
    - empty: function to create an empty resource
    - create: function to create the resource
    - delete: function to delete the resource
    - restore: function to restore resource from cache
    """
    resource = empty()

    if reuse(request):
        existing_resource = pytestconfig.cache.get(key, None)
        if existing_resource:
            assert isinstance(existing_resource, dict)
            logger.info("Reusing existing %s(%s)", key, existing_resource)
            return restore(existing_resource)

    if not teardown(request):
        resource = create()

    def finalizer():
        nonlocal resource
        if reuse(request):
            logger.info(
                "Skipping removal of %s",
                resource.__log__() if hasattr(resource, "__log__") else resource,
            )
            return

        if teardown(request):
            existing_resource = pytestconfig.cache.get(key, None)
            if not existing_resource:
                logger.info(
                    "Skipping removal of %s, no existing %s found. Maybe you ran teardown without reuse?",
                    key,
                    key,
                )
                return

            resource = restore(existing_resource)

        logger.info(
            "Removing %s",
            resource.__log__() if hasattr(resource, "__log__") else resource,
        )
        delete(resource)

        pytestconfig.cache.set(key, None)

    request.addfinalizer(finalizer)

    if reuse(request):
        pytestconfig.cache.set(
            key, resource.__cache__() if hasattr(resource, "__cache__") else resource
        )

    return resource
