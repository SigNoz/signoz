import uuid
from http import HTTPStatus
from typing import Callable

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrationsutils import simulate_agent_checkin
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

CLOUD_PROVIDER = "aws"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


def test_agent_check_in(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test agent check-in with new camelCase fields returns 200 with expected response shape."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token, CLOUD_PROVIDER, regions=["us-east-1"]
    )
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(
        signoz,
        admin_token,
        CLOUD_PROVIDER,
        account_id,
        provider_account_id,
        data={"version": "v0.0.8"},
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]

    # New camelCase fields
    assert data["cloudIntegrationId"] == account_id, "cloudIntegrationId should match"
    assert (
        data["providerAccountId"] == provider_account_id
    ), "providerAccountId should match"
    assert "integrationConfig" in data, "Response should contain 'integrationConfig'"
    assert data["removedAt"] is None, "removedAt should be null for a live account"

    # Backward-compat snake_case fields
    assert data["account_id"] == account_id, "account_id (compat) should match"
    assert (
        data["cloud_account_id"] == provider_account_id
    ), "cloud_account_id (compat) should match"
    assert (
        "integration_config" in data
    ), "Response should contain 'integration_config' (compat)"
    assert "removed_at" in data, "Response should contain 'removed_at' (compat)"

    # integrationConfig should reflect the configured regions
    integration_config = data["integrationConfig"]
    assert "aws" in integration_config, "integrationConfig should contain 'aws' block"
    assert integration_config["aws"]["enabledRegions"] == [
        "us-east-1"
    ], "enabledRegions should match account config"


def test_agent_check_in_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test that check-in with an unknown cloudIntegrationId returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    fake_id = str(uuid.uuid4())

    response = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, fake_id, str(uuid.uuid4())
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}: {response.text}"


def test_duplicate_cloud_account_checkins(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test that two different accounts cannot check in with the same providerAccountId."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account1 = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account2 = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)

    assert account1["id"] != account2["id"], "Two accounts should have different IDs"

    same_provider_account_id = str(uuid.uuid4())

    # First check-in: account1 claims the provider account ID
    response = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account1["id"], same_provider_account_id
    )
    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200 for first check-in, got {response.status_code}: {response.text}"

    # Second check-in: account2 tries to claim the same provider account ID → 409
    response = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account2["id"], same_provider_account_id
    )
    assert (
        response.status_code == HTTPStatus.CONFLICT
    ), f"Expected 409 for duplicate providerAccountId, got {response.status_code}: {response.text}"
