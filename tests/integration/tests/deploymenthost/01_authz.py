from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
)
from fixtures.role import find_role_by_name, transaction_group

_EDITOR_EMAIL = "editor+zeushosts@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+zeushosts@integration.test"
_VIEWER_PASSWORD = "password123Z$"

_ACTOR_ROLE_NAME = "deployment-host-fga-actor"
_ACTOR_EMAIL = "customrole+zeushosts@integration.test"
_ACTOR_PASSWORD = "password123Z$"

_DEPLOYMENT_MAPPING = Mapping(
    request=MappingRequest(
        method=HttpMethods.GET,
        url="/v2/deployments/me",
        headers={"X-Signoz-Cloud-Api-Key": {WireMockMatchers.EQUAL_TO: "secret-key"}},
    ),
    response=MappingResponse(
        status=200,
        json_body={
            "status": "success",
            "data": {
                "name": "aurora",
                "state": "HEALTHY",
                "tier": "ENTERPRISE",
                "cluster": {"region": {"dns": "integration.signoz.cloud"}},
                "hosts": [{"name": "aurora", "is_default": True}],
            },
        },
    ),
    persistent=False,
)

_PUT_HOST_MAPPING = Mapping(
    request=MappingRequest(
        method=HttpMethods.PUT,
        url="/v2/deployments/me/host",
        headers={"X-Signoz-Cloud-Api-Key": {WireMockMatchers.EQUAL_TO: "secret-key"}},
    ),
    response=MappingResponse(
        status=200,
        json_body={"status": "success", "data": {}},
    ),
    persistent=False,
)


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_managed_role_users(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for email, role, password, name in (
        (_EDITOR_EMAIL, "signoz-editor", _EDITOR_PASSWORD, "zeus hosts editor"),
        (_VIEWER_EMAIL, "signoz-viewer", _VIEWER_PASSWORD, "zeus hosts viewer"),
    ):
        create_active_user(signoz, admin_token, email=email, role=role, password=password, name=name)


def test_all_managed_roles_can_get_hosts(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
):
    make_http_mocks(signoz.zeus, [_DEPLOYMENT_MAPPING])

    for email, password in (
        (USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        (_EDITOR_EMAIL, _EDITOR_PASSWORD),
        (_VIEWER_EMAIL, _VIEWER_PASSWORD),
    ):
        token = get_token(email, password)

        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"{email} get hosts: expected 200, got {response.status_code}: {response.text}"
        assert response.json()["data"]["name"] == "aurora"


def test_only_admin_can_put_host(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
):
    make_http_mocks(signoz.zeus, [_PUT_HOST_MAPPING])

    for email, password in ((_EDITOR_EMAIL, _EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)

        response = requests.put(
            signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
            json={"name": "aurora-renamed"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} put host: expected 403, got {response.status_code}: {response.text}"

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        json={"name": "aurora-renamed"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"admin put host: {response.text}"


def test_setup_actor(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(admin_token, _ACTOR_ROLE_NAME)

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_ACTOR_EMAIL,
        role="signoz-viewer",
        password=_ACTOR_PASSWORD,
        name="deployment-host-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_actor_without_grants_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"get without grant: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        json={"name": "aurora-actor"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"put without grant: expected 403, got {response.status_code}: {response.text}"


def test_actor_list_grant_allows_get_only(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("list", "metaresource", "deployment-host", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    make_http_mocks(signoz.zeus, [_DEPLOYMENT_MAPPING])

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, f"get with list grant: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        json={"name": "aurora-actor"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"put with list-only grant: expected 403, got {response.status_code}: {response.text}"


def test_actor_update_grant_allows_put(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("list", "metaresource", "deployment-host", ["*"]),
                transaction_group("update", "metaresource", "deployment-host", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    make_http_mocks(signoz.zeus, [_PUT_HOST_MAPPING])

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/zeus/hosts"),
        json={"name": "aurora-actor"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"put with update grant: {response.text}"


def test_create_verb_rejected_for_deployment_host(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("create", "metaresource", "deployment-host", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, f"create verb on list/update-only resource: expected 400, got {response.status_code}: {response.text}"
