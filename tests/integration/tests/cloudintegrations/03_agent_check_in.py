import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrations import (
    ProviderAccountSpec,
    simulate_agent_checkin,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

AWS_ACCOUNT_SPEC = ProviderAccountSpec(
    provider="aws",
    initial_params={"deployment_region": "us-east-1", "regions": ["us-east-1"]},
    build_config=lambda p: {"aws": {"deploymentRegion": p["deployment_region"], "regions": p["regions"]}},
    expected_config=lambda p: {"regions": p["regions"]},
)

GCP_ACCOUNT_SPEC = ProviderAccountSpec(
    provider="gcp",
    initial_params={
        "deployment_project_id": "signoz-test-project",
        "deployment_region": "us-central1",
        "project_ids": ["signoz-test-project"],
    },
    build_config=lambda p: {
        "gcp": {
            "deploymentProjectId": p["deployment_project_id"],
            "deploymentRegion": p["deployment_region"],
            "projectIds": p["project_ids"],
        }
    },
    expected_config=lambda p: {
        "deploymentProjectId": p["deployment_project_id"],
        "deploymentRegion": p["deployment_region"],
        "projectIds": p["project_ids"],
    },
)

PROVIDER_ACCOUNT_SPECS = [AWS_ACCOUNT_SPEC, GCP_ACCOUNT_SPEC]

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
def test_agent_check_in(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(
        signoz,
        admin_token,
        spec.provider,
        account_id,
        provider_account_id,
        data={"version": "v0.0.8"},
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()["data"]

    assert data["cloudIntegrationId"] == account_id, "cloudIntegrationId should match"
    assert data["providerAccountId"] == provider_account_id, "providerAccountId should match"
    assert "integrationConfig" in data, "Response should contain 'integrationConfig'"
    assert data["removedAt"] is None, "removedAt should be null for a live account"

    if spec.provider == "aws":
        # Backward compat for agents deployed before the camelCase response; AWS only.
        assert data["account_id"] == account_id, "account_id (compat) should match"
        assert data["cloud_account_id"] == provider_account_id, "cloud_account_id (compat) should match"
        assert "integration_config" in data, "Response should contain 'integration_config' (compat)"
        assert "removed_at" in data, "Response should contain 'removed_at' (compat)"

        integration_config = data["integrationConfig"]
        assert "aws" in integration_config, "integrationConfig should contain 'aws' block"
        assert integration_config["aws"]["enabledRegions"] == spec.initial_params["regions"], "enabledRegions should match account config"
    else:
        # GCP is a manual flow: the agent carries its own configuration.
        assert data["integrationConfig"].get("gcp") is None, f"GCP should not return an integration config, got: {data['integrationConfig']}"


@provider_spec
def test_agent_check_in_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderAccountSpec,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    fake_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, spec.provider, fake_id, str(uuid.uuid4()))

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}: {response.text}"


@provider_spec
def test_duplicate_cloud_account_checkins(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    """Test that two different accounts cannot check in with the same providerAccountId."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account1 = create_cloud_integration_account(admin_token, spec.provider, config=spec.build_config(spec.initial_params))
    account2 = create_cloud_integration_account(admin_token, spec.provider, config=spec.build_config(spec.initial_params))

    assert account1["id"] != account2["id"], "Two accounts should have different IDs"

    same_provider_account_id = str(uuid.uuid4())

    # First check-in: account1 claims the provider account ID
    response = simulate_agent_checkin(signoz, admin_token, spec.provider, account1["id"], same_provider_account_id)
    assert response.status_code == HTTPStatus.OK, f"Expected 200 for first check-in, got {response.status_code}: {response.text}"

    # Second check-in: account2 tries to claim the same provider account ID → 409
    response = simulate_agent_checkin(signoz, admin_token, spec.provider, account2["id"], same_provider_account_id)
    assert response.status_code == HTTPStatus.CONFLICT, f"Expected 409 for duplicate providerAccountId, got {response.status_code}: {response.text}"
