import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrations import (
    PROVIDER_ACCOUNT_SPECS,
    ProviderAccountSpec,
    simulate_agent_checkin,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# Every account test runs once per provider in PROVIDER_ACCOUNT_SPECS. Each spec
# owns its provider's config shape (build_config / expected_config), so the test
# bodies stay provider-agnostic and adding a provider needs no changes here.
provider_spec = pytest.mark.parametrize(
    "spec",
    PROVIDER_ACCOUNT_SPECS,
    ids=[s.id for s in PROVIDER_ACCOUNT_SPECS],
)


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


@provider_spec
def test_list_accounts_empty(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderAccountSpec,
) -> None:
    """List accounts returns an empty list when no accounts have checked in."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert "accounts" in data, "Response should contain 'accounts' field"
    assert isinstance(data["accounts"], list), "accounts should be a list"
    assert len(data["accounts"]) == 0, "accounts list should be empty when no accounts have checked in"


@provider_spec
def test_list_accounts_after_checkin(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """List accounts returns an account, with its provider config, after check-in."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, provider_account_id)
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    found = next((a for a in data["accounts"] if a["id"] == account_id), None)
    assert found is not None, f"Account {account_id} should appear in list after check-in"
    assert found["providerAccountId"] == provider_account_id, "providerAccountId should match"
    assert found["config"][spec.provider] == spec.expected_config(spec.initial_params), "config should match account config"
    assert found["agentReport"] is not None, "agentReport should be present after check-in"
    assert found["removedAt"] is None, "removedAt should be null for a live account"


@provider_spec
def test_get_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """Get a specific account by ID returns the account with its provider config."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == account_id, "id should match"
    assert data["config"][spec.provider] == spec.expected_config(spec.initial_params), "config should match"
    assert data["removedAt"] is None, "removedAt should be null"


@provider_spec
def test_get_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderAccountSpec,
) -> None:
    """Get a non-existent account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


@provider_spec
def test_update_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """Update account config and verify the change is persisted via GET."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_config(spec.updated_params)},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert get_response.status_code == HTTPStatus.OK
    assert get_response.json()["data"]["config"][spec.provider] == spec.expected_config(spec.updated_params), "Config should reflect the update"


@provider_spec
def test_update_account_after_checkin_preserves_connected_status(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """Updating config after agent check-in must not remove the account from the connected list.

    Regression test: previously, updating an account would reset account_id to NULL,
    causing the account to disappear from the connected accounts listing
    (which filters on account_id IS NOT NULL).
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # 1. Create account
    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    # 2. Agent checks in — sets account_id and last_agent_report
    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, provider_account_id)
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    # 3. Verify the account appears in the connected list
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK
    accounts_before = list_response.json()["data"]["accounts"]
    found_before = next((a for a in accounts_before if a["id"] == account_id), None)
    assert found_before is not None, "Account should be listed after check-in"

    # 4. Update account config
    update_response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_config(spec.updated_params)},
        timeout=10,
    )
    assert update_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {update_response.status_code}"

    # 5. Verify the account still appears in the connected list with correct fields
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK
    accounts_after = list_response.json()["data"]["accounts"]
    found_after = next((a for a in accounts_after if a["id"] == account_id), None)
    assert found_after is not None, "Account must still be listed after config update (account_id should not be reset)"
    assert found_after["providerAccountId"] == provider_account_id, "providerAccountId should be preserved after update"
    assert found_after["agentReport"] is not None, "agentReport should be preserved after update"
    assert found_after["config"][spec.provider] == spec.expected_config(spec.updated_params), "Config should reflect the update"
    assert found_after["removedAt"] is None, "removedAt should still be null"


@provider_spec
def test_disconnect_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """Disconnect an account removes it from the connected list."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"

    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    accounts = list_response.json()["data"]["accounts"]
    assert not any(a["id"] == account_id for a in accounts), "Disconnected account should not appear in the connected list"


@provider_spec
def test_disconnect_account_idempotent(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderAccountSpec,
) -> None:
    """Disconnect on a non-existent account ID returns 204 (blind update, no existence check)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"
