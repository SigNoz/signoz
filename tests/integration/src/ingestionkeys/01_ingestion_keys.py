from http import HTTPStatus
from typing import Callable, List

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
)

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.gatewayutils import (
    TEST_KEY_ID,
    common_gateway_headers,
    get_gateway_requests,
    get_latest_gateway_request_body,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, List[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Activate a license so that all subsequent gateway calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


# ---------------------------------------------------------------------------
# Ingestion key CRUD
# ---------------------------------------------------------------------------


def test_create_ingestion_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """POST /api/v2/gateway/ingestion_keys creates a key via the gateway."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v1/workspaces/me/keys",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {
                            "id": TEST_KEY_ID,
                            "value": "ingestion-key-secret-value",
                        },
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/gateway/ingestion_keys"),
        json={
            "name": "my-test-key",
            "tags": ["env:test", "team:platform"],
            "expires_at": "2030-01-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.CREATED
    ), f"Expected 201, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert data["id"] == TEST_KEY_ID
    assert data["value"] == "ingestion-key-secret-value"

    # Verify the body forwarded to the gateway
    body = get_latest_gateway_request_body(signoz, "POST", "/v1/workspaces/me/keys")
    assert body is not None, "Expected a POST request to reach the gateway"
    assert body["name"] == "my-test-key"
    assert body["tags"] == ["env:test", "team:platform"]


def test_get_ingestion_keys(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """GET /api/v2/gateway/ingestion_keys lists keys via the gateway."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Default page=1, per_page=10 → gateway gets ?page=1&per_page=10
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
                        "data": [
                            {
                                "id": TEST_KEY_ID,
                                "name": "my-test-key",
                                "value": "secret",
                                "expires_at": "2030-01-01T00:00:00Z",
                                "tags": ["env:test"],
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z",
                                "workspace_id": "ws-1",
                                "limits": [],
                            }
                        ],
                        "_pagination": {
                            "page": 1,
                            "per_page": 10,
                            "pages": 1,
                            "total": 1,
                        },
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

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert len(data["keys"]) == 1
    assert data["keys"][0]["id"] == TEST_KEY_ID
    assert data["keys"][0]["name"] == "my-test-key"
    assert data["_pagination"]["total"] == 1


def test_get_ingestion_keys_custom_pagination(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """GET /api/v2/gateway/ingestion_keys with custom pagination params."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys?page=2&per_page=5",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "data": [],
                        "_pagination": {
                            "page": 2,
                            "per_page": 5,
                            "pages": 1,
                            "total": 3,
                        },
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v2/gateway/ingestion_keys?page=2&per_page=5"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert len(data["keys"]) == 0
    assert data["_pagination"]["page"] == 2
    assert data["_pagination"]["per_page"] == 5


def test_search_ingestion_keys(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """GET /api/v2/gateway/ingestion_keys/search searches keys by name."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # name, page, per_page are sorted alphabetically by Go url.Values.Encode()
    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=my-test&page=1&per_page=10",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "data": [
                            {
                                "id": TEST_KEY_ID,
                                "name": "my-test-key",
                                "value": "secret",
                                "expires_at": "2030-01-01T00:00:00Z",
                                "tags": ["env:test"],
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z",
                                "workspace_id": "ws-1",
                                "limits": [],
                            }
                        ],
                        "_pagination": {
                            "page": 1,
                            "per_page": 10,
                            "pages": 1,
                            "total": 1,
                        },
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v2/gateway/ingestion_keys/search?name=my-test"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert len(data["keys"]) == 1
    assert data["keys"][0]["name"] == "my-test-key"


def test_search_ingestion_keys_empty(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Search returns an empty list when no keys match."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=nonexistent&page=1&per_page=10",
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "data": [],
                        "_pagination": {
                            "page": 1,
                            "per_page": 10,
                            "pages": 0,
                            "total": 0,
                        },
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v2/gateway/ingestion_keys/search?name=nonexistent"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert len(data["keys"]) == 0
    assert data["_pagination"]["total"] == 0


def test_update_ingestion_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """PATCH /api/v2/gateway/ingestion_keys/{keyId} updates a key via the gateway."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.PATCH,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.patch(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}"
        ),
        json={
            "name": "renamed-key",
            "tags": ["env:prod"],
            "expires_at": "2031-06-15T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    # Verify the body forwarded to the gateway
    body = get_latest_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body is not None, "Expected a PATCH request to reach the gateway"
    assert body["name"] == "renamed-key"
    assert body["tags"] == ["env:prod"]


def test_delete_ingestion_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """DELETE /api/v2/gateway/ingestion_keys/{keyId} deletes a key via the gateway."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.DELETE,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    # Verify at least one DELETE reached the gateway
    matched = get_gateway_requests(signoz, "DELETE", gateway_url)
    assert len(matched) >= 1, "Expected a DELETE request to reach the gateway"
