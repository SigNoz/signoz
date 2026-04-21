# Deprecation shim: fixtures.alertutils helpers moved into fixtures.alerts.
# To be removed once all integration/ import sites are swept to the new path.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.alerts import *  # noqa: F401,F403
