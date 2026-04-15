from http import HTTPStatus
from typing import Callable

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
)

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrationsutils import setup_create_account_mocks
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

CLOUD_PROVIDER = "aws"
CREDENTIALS_ENDPOINT = f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/credentials"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


def test_get_credentials_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Happy path: all four credential fields are returned when Zeus and Gateway respond."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    setup_create_account_mocks(signoz, make_http_mocks)

    response = requests.get(
        signoz.self.host_configs["8080"].get(CREDENTIALS_ENDPOINT),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    for field in ("sigNozApiUrl", "sigNozApiKey", "ingestionUrl", "ingestionKey"):
        assert field in data, f"Response should contain '{field}'"
        assert isinstance(data[field], str), f"'{field}' should be a string"
        assert (
            len(data[field]) > 0
        ), f"'{field}' should be non-empty when mocks are set up"


def test_get_credentials_partial_when_zeus_unavailable(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """When Zeus is unavailable, server still returns 200 with partial credentials.

    The server silently ignores errors from individual credential lookups and returns
    whatever it could resolve. The frontend is responsible for prompting the user to
    fill in any empty fields.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Reset Zeus mappings so no prior mock bleeds into this test,
    # ensuring sigNozApiUrl cannot be resolved and will be returned as empty.
    requests.post(
        signoz.zeus.host_configs["8080"].get("/__admin/reset"),
        timeout=10,
    )

    # Only set up Gateway mocks — Zeus has no mapping, so sigNozApiUrl will be empty
    make_http_mocks(
        signoz.gateway,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=aws-integration&page=1&per_page=10",
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": [],
                        "_pagination": {"page": 1, "per_page": 10, "total": 0},
                    },
                ),
                persistent=False,
            ),
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v1/workspaces/me/keys",
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "aws-integration",
                            "value": "test-ingestion-key-123456",
                        },
                        "error": "",
                    },
                ),
                persistent=False,
            ),
        ],
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(CREDENTIALS_ENDPOINT),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200 even without Zeus, got {response.status_code}: {response.text}"

    data = response.json()["data"]
    for field in ("sigNozApiUrl", "sigNozApiKey", "ingestionUrl", "ingestionKey"):
        assert field in data, f"Response should always contain '{field}' key"
        assert isinstance(data[field], str), f"'{field}' should be a string"

    # sigNozApiUrl comes from Zeus, which is unavailable, so it should be empty
    assert (
        data["sigNozApiUrl"] == ""
    ), "sigNozApiUrl should be empty when Zeus is unavailable"


def test_get_credentials_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Unsupported cloud provider returns 400."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v1/cloud_integrations/gcp/credentials"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400 for unsupported provider, got {response.status_code}"
    assert "error" in response.json(), "Response should contain 'error' field"
