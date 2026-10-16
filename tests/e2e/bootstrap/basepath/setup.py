# The root bootstrap's tests, collected again here so they resolve the
# base-path fixtures from this package's conftest.py.
from e2e.bootstrap.setup import test_setup, test_teardown

__all__ = ["test_setup", "test_teardown"]
