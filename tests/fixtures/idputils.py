# Deprecation shim: fixtures.idputils moved to fixtures.idp now that the
# Keycloak container lives at fixtures.keycloak. To be removed once all
# integration/ import sites are swept to the new path.
# pylint: disable=wildcard-import,unused-wildcard-import
from fixtures.idp import *  # noqa: F401,F403
