from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
)

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    create_active_user,
)
from fixtures.gateway import (
    TEST_KEY_ID,
    TEST_LIMIT_ID,
    common_gateway_headers,
)

GATEWAY_AUTHZ_VIEWER_EMAIL = "gatewayauthzviewer@integration.test"
GATEWAY_AUTHZ_VIEWER_PASSWORD = "password123Z$"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_viewer_user(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(
        signoz,
        admin_token,
        email=GATEWAY_AUTHZ_VIEWER_EMAIL,
        role="signoz-viewer",
        password=GATEWAY_AUTHZ_VIEWER_PASSWORD,
    )


def test_admin_allowed_list_ingestion_keys(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys?page=1&per_page=10",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "data": [],
                        "_pagination": {"page": 1, "per_page": 10, "pages": 0, "total": 0},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/gateway/ingestion_keys"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}: {response.text}"


def test_admin_allowed_create_ingestion_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "6a9fb17c-8dae-4fcf-b4d1-7d8e9fa0b1c2"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/gateway/ingestion_limits"),
        json={
            "key_id": TEST_KEY_ID,
            "signal": "logs",
            "config": {"day": {"size": 1000}},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.CREATED, f"Expected 201, got {response.status_code}: {response.text}"


@pytest.mark.parametrize(
    "method, path, body",
    [
        ("GET", "/api/v2/gateway/ingestion_keys", None),
        ("GET", "/api/v2/gateway/ingestion_keys/search?name=foo", None),
        ("GET", f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}", None),
        ("POST", "/api/v2/gateway/ingestion_keys", {"name": "denied-key"}),
        ("PATCH", f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}", {"name": "denied-key"}),
        ("DELETE", f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}", None),
        (
            "POST",
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits",
            {"signal": "logs", "config": {"day": {"size": 1000}}},
        ),
        (
            "PATCH",
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}",
            {"config": {"day": {"size": 1000}}},
        ),
        ("DELETE", f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}", None),
        (
            "POST",
            "/api/v2/gateway/ingestion_limits",
            {"key_id": TEST_KEY_ID, "signal": "logs", "config": {"day": {"size": 1000}}},
        ),
        (
            "PATCH",
            f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}",
            {"config": {"day": {"size": 1000}}},
        ),
        ("DELETE", f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}", None),
        ("GET", f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}", None),
    ],
    ids=[
        "list_keys",
        "search_keys",
        "get_key",
        "create_key",
        "update_key",
        "delete_key",
        "create_key_limit_deprecated",
        "update_key_limit_deprecated",
        "delete_key_limit_deprecated",
        "create_limit",
        "update_limit",
        "delete_limit",
        "get_limit",
    ],
)
def test_viewer_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    method: str,
    path: str,
    body: dict | None,
) -> None:
    viewer_token = get_token(GATEWAY_AUTHZ_VIEWER_EMAIL, GATEWAY_AUTHZ_VIEWER_PASSWORD)

    # Delete routes resolve the limit's parent key upstream before the authz check.
    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url=f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {"id": TEST_LIMIT_ID, "key_id": TEST_KEY_ID, "signal": "logs"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.request(
        method,
        signoz.self.host_configs["8080"].get(path),
        json=body,
        headers={"Authorization": f"Bearer {viewer_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.FORBIDDEN, f"expected 403 for {method} {path}, got {response.status_code}: {response.text}"
