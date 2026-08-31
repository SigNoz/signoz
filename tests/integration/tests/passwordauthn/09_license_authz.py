import http
from collections.abc import Callable

import requests
from wiremock.client import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    change_user_role,
    create_active_user,
    license_mapping,
)
from fixtures.role import transaction_group

_EDITOR_EMAIL = "editor+licenseauthz@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+licenseauthz@integration.test"
_VIEWER_PASSWORD = "password123Z$"

_ACTOR_ROLE_NAME = "license-fga-actor"
_ACTOR_EMAIL = "customrole+licenseauthz@integration.test"
_ACTOR_PASSWORD = "password123Z$"

_LICENSE_ID = "0196360e-90cd-7a74-8313-1aa815ce2a69"
_LICENSE_KEY = "secret-key-authz"

_SELF_HOSTED_LICENSE_ID = "0196360e-90cd-7a74-8313-1aa815ce2a70"
_SELF_HOSTED_LICENSE_KEY = "secret-key-selfhosted"


def test_admin_can_activate_license(
    signoz: types.SigNoz,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    make_http_mocks(signoz.zeus, [license_mapping(_LICENSE_ID, _LICENSE_KEY, valid_from=1732146930)])

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for email, role, password, name in (
        (_EDITOR_EMAIL, "signoz-editor", _EDITOR_PASSWORD, "license authz editor"),
        (_VIEWER_EMAIL, "signoz-viewer", _VIEWER_PASSWORD, "license authz viewer"),
    ):
        create_active_user(signoz, admin_token, email=email, role=role, password=password, name=name)

    response = requests.post(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses"),
        json={"key": _LICENSE_KEY},
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )

    assert response.status_code == http.HTTPStatus.ACCEPTED, response.text


def test_editor_and_viewer_forbidden(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    for email, password in ((_EDITOR_EMAIL, _EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)

        response = requests.post(
            url=signoz.self.host_configs["8080"].get("/api/v4/licenses"),
            json={"key": _LICENSE_KEY},
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.FORBIDDEN, f"{email} activate: expected 403, got {response.status_code}: {response.text}"

        response = requests.get(
            url=signoz.self.host_configs["8080"].get("/api/v4/licenses"),
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.FORBIDDEN, f"{email} list: expected 403, got {response.status_code}: {response.text}"

        response = requests.get(
            url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.FORBIDDEN, f"{email} read: expected 403, got {response.status_code}: {response.text}"

        response = requests.put(
            url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.FORBIDDEN, f"{email} refresh: expected 403, got {response.status_code}: {response.text}"


def test_all_roles_can_get_active_license_without_key(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    for email, password in (
        (USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        (_EDITOR_EMAIL, _EDITOR_PASSWORD),
        (_VIEWER_EMAIL, _VIEWER_PASSWORD),
    ):
        token = get_token(email, password)

        response = requests.get(
            url=signoz.self.host_configs["8080"].get("/api/v4/licenses/active"),
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.OK, f"{email} get active: expected 200, got {response.status_code}: {response.text}"
        assert response.json()["data"]["id"] == _LICENSE_ID
        assert "key" not in response.json()["data"]


def test_admin_can_list_and_read_license(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, response.text
    licenses = response.json()["data"]
    assert any(license["id"] == _LICENSE_ID for license in licenses)
    assert all("key" not in license for license in licenses)

    response = requests.get(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, response.text
    assert response.json()["data"]["key"] == _LICENSE_KEY


def test_admin_can_refresh_license(
    signoz: types.SigNoz,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    make_http_mocks(signoz.zeus, [license_mapping(_LICENSE_ID, _LICENSE_KEY, valid_from=1732146931)])

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses/active"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, response.text
    assert response.json()["data"]["valid_from"] == 1732146931


def test_custom_role_license_read_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    role_id = create_role(admin_token, _ACTOR_ROLE_NAME)
    user_id = create_active_user(
        signoz,
        admin_token,
        email=_ACTOR_EMAIL,
        role="signoz-viewer",
        password=_ACTOR_PASSWORD,
        name="license authz custom role actor",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)

    actor_token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses/active"),
        headers={"Authorization": "Bearer " + actor_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, f"get active without grant: expected 200, got {response.status_code}: {response.text}"
    assert "key" not in response.json()["data"]

    response = requests.get(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + actor_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.FORBIDDEN, f"read without grant: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        url=signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "license", ["*"]),
            ],
        },
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + actor_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, f"read with grant: expected 200, got {response.status_code}: {response.text}"
    assert response.json()["data"]["key"] == _LICENSE_KEY

    response = requests.put(
        url=signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": []},
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + actor_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.FORBIDDEN, f"read after revoke: expected 403, got {response.status_code}: {response.text}"


def test_cloud_license_cannot_be_deleted(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.BAD_REQUEST, f"delete cloud license: expected 400, got {response.status_code}: {response.text}"


def test_admin_can_delete_self_hosted_license(
    signoz: types.SigNoz,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    make_http_mocks(
        signoz.zeus,
        [license_mapping(_SELF_HOSTED_LICENSE_ID, _SELF_HOSTED_LICENSE_KEY, valid_from=1732146940, platform="SELF_HOSTED")],
    )

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses"),
        json={"key": _SELF_HOSTED_LICENSE_KEY},
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.ACCEPTED, response.text

    for email, password in ((_EDITOR_EMAIL, _EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)

        response = requests.delete(
            url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_SELF_HOSTED_LICENSE_ID}"),
            headers={"Authorization": "Bearer " + token},
            timeout=5,
        )
        assert response.status_code == http.HTTPStatus.FORBIDDEN, f"{email} delete: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_SELF_HOSTED_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        url=signoz.self.host_configs["8080"].get(f"/api/v4/licenses/{_SELF_HOSTED_LICENSE_ID}"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.NOT_FOUND, response.text

    response = requests.get(
        url=signoz.self.host_configs["8080"].get("/api/v4/licenses/active"),
        headers={"Authorization": "Bearer " + admin_token},
        timeout=5,
    )
    assert response.status_code == http.HTTPStatus.OK, response.text
    assert response.json()["data"]["id"] == _LICENSE_ID
