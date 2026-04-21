# Deprecation shim: fixtures.driver is a Selenium browser primitive —
# fixtures.browser is the new home (parallel to fixtures.http). To be
# removed once any external callers migrate.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.browser import *  # noqa: F401,F403
