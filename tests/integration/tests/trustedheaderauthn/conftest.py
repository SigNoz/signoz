import time
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import token_getter
from fixtures.logger import setup_logger
from fixtures.signoz import create_signoz

logger = setup_logger(__name__)

# Secret-mode trust config shared by every test in this suite. The header
# names use hyphens rather than underscores: identn.Config.Validate refuses
# to boot with an underscore in a configured header name, since nginx and
# similar proxies silently drop such headers. The secret value is an
# obviously-fake string chosen only to exercise the constant-time comparison
# in trust.go; it is never a real credential.
SECRET_HEADER = "X-Signoz-Trusted-Secret"
SECRET_VALUE = "trusted-header-test-secret-do-not-reuse"
EMAIL_HEADER = "X-Forwarded-Email"

# Root is disabled by default (pkg/modules/user/config.go); it must be turned
# on explicitly so the "root email is rejected" tests in both suites have a
# root user to assert against. Root doubles as the admin account this suite
# uses to create/invite/list users: SigNoz refuses a second POST
# /api/v1/register once root reconciliation has run (it is the same
# first-user bootstrap endpoint root itself would use), so `register_admin`
# cannot be combined with SIGNOZ_USER_ROOT_ENABLED. Root already holds the
# signoz-admin role (see tests/integration/tests/rootuser/02_impersonation.py),
# so authenticating as root serves the same purpose.
ROOT_USER_EMAIL = "trustedheader-root@integration.test"
ROOT_USER_PASSWORD = "password123Z$"

_SETUP_COMPLETED_MAX_ATTEMPTS = 15
_ROOT_LOGIN_MAX_ATTEMPTS = 30
_POLL_INTERVAL_SECONDS = 2


def _trusted_header_env(auto_provision: bool) -> dict:
    return {
        "SIGNOZ_IDENTN_TRUSTED__HEADER_ENABLED": True,
        "SIGNOZ_IDENTN_TRUSTED__HEADER_TRUST_MODE": "secret",
        "SIGNOZ_IDENTN_TRUSTED__HEADER_TRUST_SECRET_HEADER": SECRET_HEADER,
        "SIGNOZ_IDENTN_TRUSTED__HEADER_TRUST_SECRET_VALUE": SECRET_VALUE,
        "SIGNOZ_IDENTN_TRUSTED__HEADER_AUTO__PROVISION": auto_provision,
        "SIGNOZ_USER_ROOT_ENABLED": True,
        "SIGNOZ_USER_ROOT_EMAIL": ROOT_USER_EMAIL,
        "SIGNOZ_USER_ROOT_PASSWORD": ROOT_USER_PASSWORD,
    }


def _wait_for_setup_completed(signoz: types.SigNoz) -> None:
    """
    Poll /api/v1/version until setupCompleted is true. Modeled on
    tests/integration/tests/rootuser/01_rootuser.py's phase 1.
    """
    last_error: Exception | None = None
    for attempt in range(_SETUP_COMPLETED_MAX_ATTEMPTS):
        try:
            response = requests.get(
                signoz.self.host_configs["8080"].get("/api/v1/version"),
                timeout=2,
            )
            assert response.status_code == HTTPStatus.OK
            if response.json().get("setupCompleted") is True:
                return
        except (AssertionError, requests.RequestException) as exc:
            last_error = exc
        logger.info("Attempt %s: setupCompleted is not yet true, retrying ...", attempt + 1)
        time.sleep(_POLL_INTERVAL_SECONDS)
    raise AssertionError("setupCompleted did not become true within the expected time") from last_error


def _wait_for_root_login(signoz: types.SigNoz, email: str, password: str) -> None:
    """
    pkg/query-service/app/http_handler.go flips setupCompleted to true as soon
    as it reads config.User.Root.Enabled, before the org and the root user row
    it describes necessarily exist. The row itself is created by
    pkg/modules/user/impluser/service.go's Start(), a background loop that
    retries reconciliation every 10s on failure and keeps running after the
    server is already answering requests. rootuser/01_rootuser.py hits this
    same gap and closes it with a second poll (listing users through
    impersonation, which only succeeds once root exists). This suite does not
    enable impersonation, so it retries the real password login instead: that
    only succeeds once the reconciled root user and its password both exist,
    which is exactly the fact every test here depends on.
    """
    fetch_token = token_getter(signoz)
    last_error: Exception | None = None
    for attempt in range(_ROOT_LOGIN_MAX_ATTEMPTS):
        try:
            fetch_token(email, password)
            return
        except (AssertionError, KeyError, IndexError, requests.RequestException) as exc:
            last_error = exc
            logger.info("Attempt %s: root user cannot log in yet (%s), retrying ...", attempt + 1, exc)
            time.sleep(_POLL_INTERVAL_SECONDS)
    raise AssertionError(f"root user ({email}) did not become able to log in within the expected time") from last_error


@pytest.fixture(name="signoz", scope="package")
def signoz_trusted_header(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped SigNoz with trusted-header secret-mode auth enabled and
    auto_provision off. Used by the secret-mode suite and by the
    auto_provision:false half of the provisioning suite.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_trusted_header",
        env_overrides=_trusted_header_env(auto_provision=False),
    )


@pytest.fixture(name="signoz_auto_provision", scope="package")
def signoz_trusted_header_auto_provision(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    A second, independent SigNoz instance, identical to `signoz` except
    auto_provision is on. A package-scoped fixture carries exactly one
    configuration, and this suite needs both values of auto_provision, so the
    provisioning tests that require auto_provision:true depend on this
    fixture instead of on `signoz`.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_trusted_header_auto_provision",
        env_overrides=_trusted_header_env(auto_provision=True),
    )


@pytest.fixture(name="signoz_ready", scope="package")
def signoz_ready(signoz: types.SigNoz) -> None:
    """
    Blocks every test that depends on it until `signoz` has finished booting
    and its root user can actually authenticate, so the login/invite/list
    calls those tests make never race the asynchronous root reconciliation.
    """
    _wait_for_setup_completed(signoz)
    _wait_for_root_login(signoz, ROOT_USER_EMAIL, ROOT_USER_PASSWORD)


@pytest.fixture(name="signoz_auto_provision_ready", scope="package")
def signoz_auto_provision_ready(signoz_auto_provision: types.SigNoz) -> None:
    """Same as `signoz_ready`, for the auto_provision:true instance."""
    _wait_for_setup_completed(signoz_auto_provision)
    _wait_for_root_login(signoz_auto_provision, ROOT_USER_EMAIL, ROOT_USER_PASSWORD)


@pytest.fixture(name="get_token", scope="package")
def get_token(signoz: types.SigNoz) -> Callable[[str, str], str]:
    """
    Package-scoped rather than function-scoped (the model in fixtures/auth.py
    is function-scoped): `known_user_id` in 01_secret_mode.py is
    module-scoped and depends on this fixture to log in as root while
    creating its known user, and pytest refuses a higher-scoped fixture
    depending on a lower-scoped one. Widening here (rather than narrowing
    `known_user_id` to function scope, which would recreate that user for
    every test) is safe: the returned callable is stateless, it just performs
    a login on each call, so sharing it across the whole package changes
    nothing about what each call does.
    """
    return token_getter(signoz)


@pytest.fixture(name="get_token_auto_provision", scope="package")
def get_token_auto_provision(signoz_auto_provision: types.SigNoz) -> Callable[[str, str], str]:
    """Same reasoning as `get_token`, for the auto_provision:true instance."""
    return token_getter(signoz_auto_provision)
