import json
from http import HTTPStatus
from typing import Callable

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

TEST_KEY_ID = "test-key-id-001"
TEST_LIMIT_ID = "test-limit-id-001"


def _gateway_headers():
    """Common headers expected on requests forwarded to the gateway."""
    return {
        "X-Signoz-Cloud-Api-Key": {WireMockMatchers.EQUAL_TO: "secret-key"},
        "X-Consumer-Username": {
            WireMockMatchers.EQUAL_TO: "lid:00000000-0000-0000-0000-000000000000"
        },
        "X-Consumer-Groups": {WireMockMatchers.EQUAL_TO: "ns:default"},
    }


def _get_gateway_requests(signoz, method, url):
    """Return the list of captured requests from the WireMock journal."""
    response = requests.post(
        signoz.gateway.host_configs["8080"].get("/__admin/requests/find"),
        json={"method": method, "url": url},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    return response.json()["requests"]


def _get_single_gateway_request_body(signoz, method, url):
    """Return the parsed JSON body of the single matching request."""
    matched = _get_gateway_requests(signoz, method, url)
    assert len(matched) == 1, f"Expected 1 matching request for {method} {url}, got {len(matched)}"
    return json.loads(matched[0]["body"])


def _setup_license_and_token(signoz, make_http_mocks, get_token):
    """Add license (idempotent) and return an admin bearer token."""
    add_license(signoz, make_http_mocks, get_token)
    return get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)


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
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v1/workspaces/me/keys",
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
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
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert data["id"] == TEST_KEY_ID
    assert data["value"] == "ingestion-key-secret-value"

    # Verify the body forwarded to the gateway
    body = _get_single_gateway_request_body(signoz, "POST", "/v1/workspaces/me/keys")
    assert body["name"] == "my-test-key"
    assert body["tags"] == ["env:test", "team:platform"]


def test_get_ingestion_keys(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """GET /api/v2/gateway/ingestion_keys lists keys via the gateway."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    # Default page=1, per_page=10 → gateway gets ?page=1&per_page=10
    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys?page=1&per_page=10",
                    headers=_gateway_headers(),
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
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys?page=2&per_page=5",
                    headers=_gateway_headers(),
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
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    # name, page, per_page are sorted alphabetically by Go url.Values.Encode()
    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=my-test&page=1&per_page=10",
                    headers=_gateway_headers(),
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
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=nonexistent&page=1&per_page=10",
                    headers=_gateway_headers(),
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
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.PATCH,
                    url=gateway_url,
                    headers=_gateway_headers(),
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
    body = _get_single_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body["name"] == "renamed-key"
    assert body["tags"] == ["env:prod"]


def test_delete_ingestion_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """DELETE /api/v2/gateway/ingestion_keys/{keyId} deletes a key via the gateway."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.DELETE,
                    url=gateway_url,
                    headers=_gateway_headers(),
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

    # Verify the request reached the gateway
    matched = _get_gateway_requests(signoz, "DELETE", gateway_url)
    assert len(matched) == 1


# ---------------------------------------------------------------------------
# Ingestion key limit CRUD
# ---------------------------------------------------------------------------


def test_create_ingestion_key_limit_only_size(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with only size omits count from the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "limit-created-1"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"
        ),
        json={
            "signal": "logs",
            "config": {"day": {"size": 1000}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.CREATED
    ), f"Expected 201, got {response.status_code}: {response.text}"

    assert response.json()["data"]["id"] == "limit-created-1"

    body = _get_single_gateway_request_body(signoz, "POST", gateway_url)
    assert body["signal"] == "logs"
    assert "size" in body["config"]["day"], "size should be present"
    assert "count" not in body["config"]["day"], "count should be absent when not set"
    assert "second" not in body["config"], "second should be absent when not set"


def test_create_ingestion_key_limit_only_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with only count omits size from the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "limit-created-2"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"
        ),
        json={
            "signal": "traces",
            "config": {"day": {"count": 500}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.CREATED
    ), f"Expected 201, got {response.status_code}: {response.text}"

    body = _get_single_gateway_request_body(signoz, "POST", gateway_url)
    assert body["signal"] == "traces"
    assert "count" in body["config"]["day"], "count should be present"
    assert "size" not in body["config"]["day"], "size should be absent when not set"


def test_create_ingestion_key_limit_both_size_and_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with both size and count includes both in the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "limit-created-3"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"
        ),
        json={
            "signal": "metrics",
            "config": {
                "day": {"size": 2000, "count": 750},
                "second": {"size": 100, "count": 50},
            },
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.CREATED
    ), f"Expected 201, got {response.status_code}: {response.text}"

    body = _get_single_gateway_request_body(signoz, "POST", gateway_url)
    assert body["signal"] == "metrics"
    assert "size" in body["config"]["day"]
    assert "count" in body["config"]["day"]
    assert "size" in body["config"]["second"]
    assert "count" in body["config"]["second"]


def test_update_ingestion_key_limit_only_size(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with only size omits count from the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.PATCH,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.patch(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"
        ),
        json={
            "config": {"day": {"size": 2000}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    body = _get_single_gateway_request_body(signoz, "PATCH", gateway_url)
    assert "size" in body["config"]["day"], "size should be present"
    assert "count" not in body["config"]["day"], "count should be absent when not set"
    assert "second" not in body["config"], "second should be absent when not set"


def test_update_ingestion_key_limit_only_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with only count omits size from the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.PATCH,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.patch(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"
        ),
        json={
            "config": {"day": {"count": 750}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    body = _get_single_gateway_request_body(signoz, "PATCH", gateway_url)
    assert "count" in body["config"]["day"], "count should be present"
    assert "size" not in body["config"]["day"], "size should be absent when not set"


def test_update_ingestion_key_limit_both_size_and_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with both size and count includes both in the gateway payload."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.PATCH,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.patch(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"
        ),
        json={
            "config": {"day": {"size": 1000, "count": 500}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    body = _get_single_gateway_request_body(signoz, "PATCH", gateway_url)
    assert "size" in body["config"]["day"], "size should be present"
    assert "count" in body["config"]["day"], "count should be present"


def test_delete_ingestion_key_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """DELETE /api/v2/gateway/ingestion_keys/limits/{limitId} deletes a limit."""
    admin_token = _setup_license_and_token(signoz, make_http_mocks, get_token)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.DELETE,
                    url=gateway_url,
                    headers=_gateway_headers(),
                ),
                response=MappingResponse(status=204),
                persistent=False,
            ),
        ],
    )

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {response.status_code}: {response.text}"

    matched = _get_gateway_requests(signoz, "DELETE", gateway_url)
    assert len(matched) == 1
