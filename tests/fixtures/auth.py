import time
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.client import Mappings
from wiremock.constants import Config
from wiremock.resources.mappings import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

USER_ADMIN_NAME = "admin"
USER_ADMIN_EMAIL = "admin@integration.test"
USER_ADMIN_PASSWORD = "password123Z$"

USER_EDITOR_NAME = "editor"
USER_EDITOR_EMAIL = "editor@integration.test"
USER_EDITOR_PASSWORD = "password123Z$"

USER_VIEWER_NAME = "viewer"
USER_VIEWER_EMAIL = "viewer@integration.test"
USER_VIEWER_PASSWORD = "password123Z$"

USERS_BASE = "/api/v2/users"


def _login(signoz: types.SigNoz, email: str, password: str) -> str:
    """Complete GET /sessions/context + POST /sessions/email_password; return accessToken."""
    ctx = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": email,
            "ref": f"{signoz.self.host_configs['8080'].base()}",
        },
        timeout=5,
    )
    assert ctx.status_code == HTTPStatus.OK
    org_id = ctx.json()["data"]["orgs"][0]["id"]

    login = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
        json={"email": email, "password": password, "orgId": org_id},
        timeout=5,
    )
    assert login.status_code == HTTPStatus.OK
    return login.json()["data"]["accessToken"]


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin(signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.Operation:
    def create() -> None:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/register"),
            json={
                "name": USER_ADMIN_NAME,
                "orgName": "",
                "email": USER_ADMIN_EMAIL,
                "password": USER_ADMIN_PASSWORD,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK

        return types.Operation(name="create_user_admin")

    def delete(_: types.Operation) -> None:
        pass

    def restore(cache: dict) -> types.Operation:
        return types.Operation(name=cache["name"])

    return reuse.wrap(
        request,
        pytestconfig,
        "create_user_admin",
        lambda: types.Operation(name=""),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="get_session_context", scope="function")
def get_session_context(signoz: types.SigNoz) -> Callable[[str, str], str]:
    def _get_session_context(email: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        return response.json()["data"]

    return _get_session_context


@pytest.fixture(name="get_token", scope="function")
def get_token(signoz: types.SigNoz) -> Callable[[str, str], str]:
    def _get_token(email: str, password: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        org_id = response.json()["data"]["orgs"][0]["id"]

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
            json={
                "email": email,
                "password": password,
                "orgId": org_id,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        return response.json()["data"]["accessToken"]

    return _get_token


@pytest.fixture(name="get_tokens", scope="function")
def get_tokens(signoz: types.SigNoz) -> Callable[[str, str], tuple[str, str]]:
    def _get_tokens(email: str, password: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        org_id = response.json()["data"]["orgs"][0]["id"]

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
            json={
                "email": email,
                "password": password,
                "orgId": org_id,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        access_token = response.json()["data"]["accessToken"]
        refresh_token = response.json()["data"]["refreshToken"]
        return access_token, refresh_token

    return _get_tokens


@pytest.fixture(name="apply_license", scope="package")
def apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument,redefined-outer-name
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.Operation:
    """Stub Zeus license-lookup, then POST /api/v3/licenses so the BE flips
    to ENTERPRISE. Package-scoped so an e2e bootstrap can pull it in and
    every spec inherits the licensed state."""

    def create() -> types.Operation:
        Config.base_url = signoz.zeus.host_configs["8080"].get("/__admin")
        Mappings.create_mapping(
            mapping=Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/licenses/me",
                    headers={"X-Signoz-Cloud-Api-Key": {WireMockMatchers.EQUAL_TO: "secret-key"}},
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "id": "0196360e-90cd-7a74-8313-1aa815ce2a67",
                            "key": "secret-key",
                            "valid_from": 1732146923,
                            "valid_until": -1,
                            "status": "VALID",
                            "state": "EVALUATING",
                            "plan": {"name": "ENTERPRISE"},
                            "platform": "CLOUD",
                            "features": [],
                            "event_queue": {},
                        },
                    },
                ),
                persistent=False,
            )
        )

        access_token = _login(signoz, USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

        # 202 = applied, 409 = already applied. Retry transient failures —
        # the BE occasionally 5xxs right after startup before the license
        # sync goroutine is ready.
        license_url = signoz.self.host_configs["8080"].get("/api/v3/licenses")
        auth_header = {"Authorization": f"Bearer {access_token}"}
        for attempt in range(10):
            resp = requests.post(
                license_url,
                json={"key": "secret-key"},
                headers=auth_header,
                timeout=5,
            )
            if resp.status_code in (HTTPStatus.ACCEPTED, HTTPStatus.CONFLICT):
                break
            if attempt == 9:
                resp.raise_for_status()
            time.sleep(1)

        # The ENTERPRISE license flips on the `onboarding` feature which
        # redirects first-time admins to a questionnaire. Mark the preference
        # complete so specs can navigate directly to the feature under test.
        pref_resp = requests.put(
            signoz.self.host_configs["8080"].get("/api/v1/org/preferences/org_onboarding"),
            json={"value": True},
            headers=auth_header,
            timeout=5,
        )
        assert pref_resp.status_code in (HTTPStatus.OK, HTTPStatus.NO_CONTENT)
        return types.Operation(name="apply_license")

    def delete(_: types.Operation) -> None:
        pass

    def restore(cache: dict) -> types.Operation:
        return types.Operation(name=cache["name"])

    return reuse.wrap(
        request,
        pytestconfig,
        "apply_license",
        lambda: types.Operation(name=""),
        create,
        delete,
        restore,
    )


# This is not a fixture purposefully, we just want to add a license to the signoz instance.
# This is also idempotent in nature.
def add_license(
    signoz: types.SigNoz,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],  # pylint: disable=redefined-outer-name
) -> None:
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/licenses/me",
                    headers={"X-Signoz-Cloud-Api-Key": {WireMockMatchers.EQUAL_TO: "secret-key"}},
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "id": "0196360e-90cd-7a74-8313-1aa815ce2a67",
                            "key": "secret-key",
                            "valid_from": 1732146923,
                            "valid_until": -1,
                            "status": "VALID",
                            "state": "EVALUATING",
                            "plan": {
                                "name": "ENTERPRISE",
                            },
                            "platform": "CLOUD",
                            "features": [],
                            "event_queue": {},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    access_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        url=signoz.self.host_configs["8080"].get("/api/v3/licenses"),
        json={"key": "secret-key"},
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    if response.status_code == HTTPStatus.CONFLICT:
        return

    assert response.status_code == HTTPStatus.ACCEPTED

    response = requests.post(
        url=signoz.zeus.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "GET", "url": "/v2/licenses/me"},
        timeout=5,
    )

    assert response.json()["count"] == 1


def create_active_user(
    signoz: types.SigNoz,
    admin_token: str,
    email: str,
    role: str,
    password: str,
    name: str = "",
) -> str:
    """Invite a user and activate via resetPassword. Returns user ID."""
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": email, "role": role, "name": name},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    invited_user = response.json()["data"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": password, "token": invited_user["token"]},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    return invited_user["id"]


def find_user_by_email(signoz: types.SigNoz, token: str, email: str) -> dict:
    """Find a user by email from the user list. Raises AssertionError if not found."""
    response = requests.get(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    user = next((u for u in response.json()["data"] if u["email"] == email), None)
    assert user is not None, f"User with email '{email}' not found"
    return user


def find_user_with_roles_by_email(signoz: types.SigNoz, token: str, email: str) -> dict:
    """Find a user by email and return UserWithRoles (user fields + userRoles).

    Raises AssertionError if the user is not found.
    """
    user = find_user_by_email(signoz, token, email)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    return response.json()["data"]


def assert_user_has_role(data: dict, role_name: str) -> None:
    """Assert that a UserWithRoles response contains the expected managed role."""
    role_names = {ur["role"]["name"] for ur in data.get("userRoles", [])}
    assert role_name in role_names, f"Expected role '{role_name}' in {role_names}"


def change_user_role(
    signoz: types.SigNoz,
    admin_token: str,
    user_id: str,
    old_role: str,
    new_role: str,
) -> None:
    """Change a user's role (remove old, assign new).

    Role names should be managed role names (e.g. signoz-editor).
    """
    # Get current roles to find the old role's ID
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    roles = response.json()["data"]

    old_role_entry = next((r for r in roles if r["name"] == old_role), None)
    assert old_role_entry is not None, f"User does not have role '{old_role}'"

    # Remove old role
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/roles/{old_role_entry['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # Assign new role
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/roles"),
        json={"name": new_role},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
