from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
)

from fixtures import types
from fixtures.auth import add_license
from fixtures.gateway import (
    TEST_KEY_ID,
    TEST_LIMIT_ID,
    common_gateway_headers,
    get_gateway_requests,
    get_latest_gateway_request_body,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

GATEWAY_APIS_EDITOR_EMAIL = "gatewayapiseditor@integration.test"
GATEWAY_APIS_EDITOR_PASSWORD = "password123Z$"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Activate a license so that all subsequent gateway calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


# ---------------------------------------------------------------------------
# Create ingestion key limit
# ---------------------------------------------------------------------------


def test_create_ingestion_key_limit_only_size(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with only size omits count from the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "2c5b7d3e-4f6a-4b8c-a09d-3f4a5b6c7d8e"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"),
        json={
            "signal": "logs",
            "config": {"day": {"size": 1000}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.CREATED, f"Expected 201, got {response.status_code}: {response.text}"

    assert response.json()["data"]["id"] == "2c5b7d3e-4f6a-4b8c-a09d-3f4a5b6c7d8e"

    body = get_latest_gateway_request_body(signoz, "POST", gateway_url)
    assert body is not None, "Expected a POST request to reach the gateway"
    assert body["signal"] == "logs"
    assert body["config"]["day"]["size"] == 1000
    assert "count" not in body["config"]["day"], "count should be absent when not set"
    assert "second" not in body["config"], "second should be absent when not set"
    assert body["tags"] == ["test"]


def test_create_ingestion_key_limit_only_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with only count omits size from the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "3d6c8e4f-5a7b-4c9d-b1ae-4a5b6c7d8e9f"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"),
        json={
            "signal": "traces",
            "config": {"day": {"count": 500}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.CREATED, f"Expected 201, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "POST", gateway_url)
    assert body is not None, "Expected a POST request to reach the gateway"
    assert body["signal"] == "traces"
    assert body["config"]["day"]["count"] == 500
    assert "size" not in body["config"]["day"], "size should be absent when not set"
    assert body["tags"] == ["test"]


def test_create_ingestion_key_limit_both_size_and_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with both size and count includes both in the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "4e7d9f5a-6b8c-4dae-c2bf-5b6c7d8e9fa0"},
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/{TEST_KEY_ID}/limits"),
        json={
            "signal": "metrics",
            "config": {
                "day": {"size": 2000, "count": 750},
                "second": {"size": 100, "count": 50},
            },
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.CREATED, f"Expected 201, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "POST", gateway_url)
    assert body is not None, "Expected a POST request to reach the gateway"
    assert body["signal"] == "metrics"
    assert body["config"]["day"]["size"] == 2000
    assert body["config"]["day"]["count"] == 750
    assert body["config"]["second"]["size"] == 100
    assert body["config"]["second"]["count"] == 50
    assert body["tags"] == ["test"]


# ---------------------------------------------------------------------------
# Update ingestion key limit
# ---------------------------------------------------------------------------


def test_update_ingestion_key_limit_only_size(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with only size omits count from the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"),
        json={
            "config": {"day": {"size": 2000}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body is not None, "Expected a PATCH request to reach the gateway"
    assert body["config"]["day"]["size"] == 2000
    assert "count" not in body["config"]["day"], "count should be absent when not set"
    assert "second" not in body["config"], "second should be absent when not set"
    assert body["tags"] == ["test"]


def test_update_ingestion_key_limit_only_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with only count omits size from the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"),
        json={
            "config": {"day": {"count": 750}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body is not None, "Expected a PATCH request to reach the gateway"
    assert body["config"]["day"]["count"] == 750
    assert "size" not in body["config"]["day"], "size should be absent when not set"
    assert body["tags"] == ["test"]


def test_update_ingestion_key_limit_both_size_and_count(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Updating a limit with both size and count includes both in the gateway payload."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"),
        json={
            "config": {"day": {"size": 1000, "count": 500}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body is not None, "Expected a PATCH request to reach the gateway"
    assert body["config"]["day"]["size"] == 1000
    assert body["config"]["day"]["count"] == 500
    assert body["tags"] == ["test"]


# ---------------------------------------------------------------------------
# Delete ingestion key limit
# ---------------------------------------------------------------------------


def test_delete_ingestion_key_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """DELETE /api/v2/gateway/ingestion_keys/limits/{limitId} deletes a limit."""
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url=gateway_url,
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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    # Verify at least one DELETE reached the gateway
    matched = get_gateway_requests(signoz, "DELETE", gateway_url)
    assert len(matched) >= 1, "Expected a DELETE request to reach the gateway"


def test_create_ingestion_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/keys/{TEST_KEY_ID}/limits"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=201,
                    json_body={
                        "status": "success",
                        "data": {"id": "5f8ea06b-7c9d-4ebf-a3c0-6c7d8e9fa0b1"},
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
            "config": {"day": {"size": 3000}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.CREATED, f"Expected 201, got {response.status_code}: {response.text}"

    assert response.json()["data"]["id"] == "5f8ea06b-7c9d-4ebf-a3c0-6c7d8e9fa0b1"

    body = get_latest_gateway_request_body(signoz, "POST", gateway_url)
    assert body is not None, "Expected a POST request to reach the gateway"
    assert body["signal"] == "logs"
    assert body["config"]["day"]["size"] == 3000
    assert body["tags"] == ["test"]


def test_create_ingestion_limit_without_key_id(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/gateway/ingestion_limits"),
        json={
            "signal": "logs",
            "config": {"day": {"size": 3000}},
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400, got {response.status_code}: {response.text}"


def test_get_ingestion_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url=gateway_url,
                    headers=common_gateway_headers(),
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "id": TEST_LIMIT_ID,
                            "key_id": TEST_KEY_ID,
                            "signal": "logs",
                            "config": {"day": {"size": 1000}},
                            "tags": ["test"],
                        },
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    assert data["id"] == TEST_LIMIT_ID
    assert data["key_id"] == TEST_KEY_ID
    assert data["signal"] == "logs"
    assert data["config"]["day"]["size"] == 1000


def test_update_ingestion_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}"),
        json={
            "config": {"day": {"size": 4000, "count": 250}},
            "tags": ["test"],
        },
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    body = get_latest_gateway_request_body(signoz, "PATCH", gateway_url)
    assert body is not None, "Expected a PATCH request to reach the gateway"
    assert body["config"]["day"]["size"] == 4000
    assert body["config"]["day"]["count"] == 250
    assert body["tags"] == ["test"]


def test_delete_ingestion_limit(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    editor_token = get_token(GATEWAY_APIS_EDITOR_EMAIL, GATEWAY_APIS_EDITOR_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url=gateway_url,
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
        signoz.self.host_configs["8080"].get(f"/api/v2/gateway/ingestion_limits/{TEST_LIMIT_ID}"),
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}: {response.text}"

    matched = get_gateway_requests(signoz, "DELETE", gateway_url)
    assert len(matched) >= 1, "Expected a DELETE request to reach the gateway"
