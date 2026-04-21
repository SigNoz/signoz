# Deprecation shim: fixtures.gatewayutils moved to fixtures.gateway. To be
# removed once all integration/ import sites are swept to the new path.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.gateway import *  # noqa: F401,F403
