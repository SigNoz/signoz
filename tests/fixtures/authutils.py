# Deprecation shim: fixtures.authutils helpers moved into fixtures.auth.
# To be removed once all integration/ import sites are swept to the new path.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.auth import *  # noqa: F401,F403
