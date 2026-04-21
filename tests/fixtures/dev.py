# Deprecation shim: fixtures.dev moved to fixtures.reuse (the module IS
# the reuse/cache wrapper; "dev" said nothing). To be removed once any
# external callers migrate.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.reuse import *  # noqa: F401,F403
