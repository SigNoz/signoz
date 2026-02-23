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
    TEST_LIMIT_ID,
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
# Create ingestion key limit
# ---------------------------------------------------------------------------


def test_create_ingestion_key_limit_only_size(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Creating a limit with only size omits count from the gateway payload."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    gateway_url = f"/v1/workspaces/me/limits/{TEST_LIMIT_ID}"

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
            f"/api/v2/gateway/ingestion_keys/limits/{TEST_LIMIT_ID}"
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
