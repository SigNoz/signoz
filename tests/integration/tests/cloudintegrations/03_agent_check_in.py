import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

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
            "connectionMethod": "manual",
            "deploymentProjectId": p["deployment_project_id"],
            "deploymentRegion": p["deployment_region"],
            "projectIds": p["project_ids"],
        }
    },
    expected_config=lambda p: {
        "connectionMethod": "manual",
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

provider_account_reuse = pytest.mark.parametrize(
    "provider,account_config,provider_account_id",
    [
        pytest.param("aws", {"aws": {"deploymentRegion": "us-east-1", "regions": ["us-east-1"]}}, "123456789012", id="aws"),
        pytest.param(
            "gcp",
            {"gcp": {"connectionMethod": "manual", "deploymentProjectId": "signoz-reuse-project", "deploymentRegion": "us-central1", "projectIds": ["signoz-reuse-project"]}},
            "reused-manual-account",
            id="gcp_manual",
        ),
        pytest.param(
            "gcp",
            {"gcp": {"connectionMethod": "agent", "deploymentProjectId": "signoz-reuse-project", "deploymentRegion": "us-central1", "projectIds": ["signoz-reuse-project"]}},
            "signoz-reuse-project",
            id="gcp_agent",
        ),
    ],
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


def test_gcp_agent_check_in_returns_collection_strategy(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}
    project_id = "signoz-agent-strategy-project"
    account_id = create_cloud_integration_account(admin_token, "gcp", config={"gcp": {"connectionMethod": "agent", "deploymentProjectId": project_id, "deploymentRegion": "us-central1", "projectIds": [project_id]}})["id"]
    services_url = signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/gcp/accounts/{account_id}/services")
    mysql_sink_filter = '(resource.type="cloudsql_database" AND (logName:"/logs/cloudsql.googleapis.com%2Fmysql" OR (log_id("cloudaudit.googleapis.com/data_access") AND protoPayload.request.@type="type.googleapis.com/google.cloud.sql.audit.v1.MysqlAuditEntry")))'
    postgres_sink_filter = '(resource.type="cloudsql_database" AND (logName:"/logs/cloudsql.googleapis.com%2Fpostgres" OR (log_id("cloudaudit.googleapis.com/data_access") AND protoPayload.request.@type="type.googleapis.com/google.cloud.sql.audit.v1.PgAuditEntry")))'

    response = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, project_id)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["integrationConfig"]["gcp"] == {
        "connectionMethod": "agent",
        "deploymentProjectId": project_id,
        "deploymentRegion": "us-central1",
        "projectIds": [project_id],
        "telemetryCollectionStrategy": {"metrics": None, "logs": None},
    }

    for service_id, service_config in (
        ("cloudsql_mysql", {"metrics": {"enabled": True}, "logs": {"enabled": False}}),
        ("cloudsql_postgres", {"metrics": {"enabled": True}, "logs": {"enabled": True}}),
    ):
        response = requests.put(f"{services_url}/{service_id}", headers=headers, json={"config": {"gcp": service_config}}, timeout=10)
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, project_id)
    assert response.status_code == HTTPStatus.OK, response.text
    strategy = response.json()["data"]["integrationConfig"]["gcp"]["telemetryCollectionStrategy"]
    metric_names = strategy["metrics"]["metricNames"]
    assert metric_names == sorted(set(metric_names)), "metrics shared by MySQL and Postgres should be listed once, sorted"
    assert {"cloudsql.googleapis.com/database/up", "cloudsql.googleapis.com/database/mysql/queries", "cloudsql.googleapis.com/database/postgresql/num_backends"} <= set(metric_names)
    assert strategy["logs"] == {"sinkFilter": postgres_sink_filter}, "only services with logs enabled should contribute a sink filter"

    response = requests.put(f"{services_url}/cloudsql_mysql", headers=headers, json={"config": {"gcp": {"metrics": {"enabled": False}, "logs": {"enabled": True}}}}, timeout=10)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, project_id)
    assert response.status_code == HTTPStatus.OK, response.text
    strategy = response.json()["data"]["integrationConfig"]["gcp"]["telemetryCollectionStrategy"]
    assert "cloudsql.googleapis.com/database/up" in strategy["metrics"]["metricNames"], "Postgres should still collect the shared metrics"
    assert not [name for name in strategy["metrics"]["metricNames"] if "/database/mysql/" in name], "MySQL metrics should stop once its metrics are disabled"
    assert strategy["logs"] == {"sinkFilter": f"{mysql_sink_filter} OR {postgres_sink_filter}"}


def test_gcp_agent_check_in_rejects_other_project(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    project_id = "signoz-agent-mismatch-project"
    account_id = create_cloud_integration_account(admin_token, "gcp", config={"gcp": {"connectionMethod": "agent", "deploymentProjectId": project_id, "deploymentRegion": "us-central1", "projectIds": [project_id]}})["id"]

    response = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, "signoz-other-project")
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/gcp/accounts/{account_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["providerAccountId"] is None, "a rejected check-in must not connect the account"
    assert response.json()["data"]["agentReport"] is None

    response = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, project_id)
    assert response.status_code == HTTPStatus.OK, response.text


@provider_account_reuse
def test_removed_account_checkins_after_provider_account_id_is_reused(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    provider: str,
    account_config: dict,
    provider_account_id: str,
) -> None:
    """Connect old account, remove it, connect replacement, then check in from the old agent."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}
    accounts_url = signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{provider}/accounts")

    # The original agent connects before its integration is removed.
    old_account_id = create_cloud_integration_account(admin_token, provider, config=account_config)["id"]
    response = simulate_agent_checkin(signoz, admin_token, provider, old_account_id, provider_account_id, data={"version": "old-agent"})
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.delete(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    old_account_before_checkins = response.json()["data"]

    # A new integration claims the same provider account ID.
    replacement_id = create_cloud_integration_account(admin_token, provider, config=account_config)["id"]
    response = simulate_agent_checkin(signoz, admin_token, provider, replacement_id, provider_account_id, data={"version": "replacement-agent"})
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(f"{accounts_url}/{replacement_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    replacement_before_checkins = response.json()["data"]

    # The old agent keeps retrying. It must receive removal instructions, rather than a 409.
    for _ in range(3):
        response = simulate_agent_checkin(signoz, admin_token, provider, old_account_id, provider_account_id, data={"version": "old-agent-after-removal"})
        assert response.status_code == HTTPStatus.OK, response.text
        cleanup_response = response.json()["data"]
        assert cleanup_response["cloudIntegrationId"] == old_account_id
        assert cleanup_response["providerAccountId"] == provider_account_id
        assert cleanup_response["removedAt"] is not None
        assert cleanup_response["removedAt"] == old_account_before_checkins["removedAt"]
        assert cleanup_response["integrationConfig"] == {}

    # Cleanup may update sync state, but must preserve the original heartbeat, data and identity.
    response = requests.get(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    removed_account = response.json()["data"]
    assert removed_account["providerAccountId"] == old_account_before_checkins["providerAccountId"]
    assert removed_account["agentReport"]["timestampMillis"] == old_account_before_checkins["agentReport"]["timestampMillis"]
    assert removed_account["agentReport"]["data"] == old_account_before_checkins["agentReport"]["data"]
    assert removed_account["agentReport"]["syncState"] == cleanup_response["syncState"]

    response = requests.get(f"{accounts_url}/{replacement_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == replacement_before_checkins, "old check-ins must not change the replacement account"

    response = simulate_agent_checkin(signoz, admin_token, provider, replacement_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["removedAt"] is None


@provider_account_reuse
def test_removed_account_first_checkin_after_provider_account_id_is_reused(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    provider: str,
    account_config: dict,
    provider_account_id: str,
) -> None:
    """Removal before the first heartbeat must still be reported after another integration claims the provider ID."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}
    accounts_url = signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{provider}/accounts")

    # Remove the original integration before its agent has checked in even once.
    old_account_id = create_cloud_integration_account(admin_token, provider, config=account_config)["id"]
    response = requests.delete(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    old_account_before_checkins = response.json()["data"]
    assert old_account_before_checkins["providerAccountId"] is None
    assert old_account_before_checkins["agentReport"] is None

    replacement_id = create_cloud_integration_account(admin_token, provider, config=account_config)["id"]
    response = simulate_agent_checkin(signoz, admin_token, provider, replacement_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(f"{accounts_url}/{replacement_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    replacement_before_checkins = response.json()["data"]

    # Late first check-ins must report removal without creating a heartbeat or claiming the ID.
    for _ in range(3):
        response = simulate_agent_checkin(signoz, admin_token, provider, old_account_id, provider_account_id)
        assert response.status_code == HTTPStatus.OK, response.text
        cleanup_response = response.json()["data"]
        assert cleanup_response["cloudIntegrationId"] == old_account_id
        assert cleanup_response["providerAccountId"] == provider_account_id
        assert cleanup_response["removedAt"] == old_account_before_checkins["removedAt"]
        assert cleanup_response["removedAt"] is not None
        assert cleanup_response["integrationConfig"] == {}

    response = requests.get(f"{accounts_url}/{old_account_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == old_account_before_checkins, "late first check-ins must not change a removed account"

    response = requests.get(f"{accounts_url}/{replacement_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == replacement_before_checkins

    response = simulate_agent_checkin(signoz, admin_token, provider, replacement_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["removedAt"] is None


def test_sync_state_drops_removed_region_after_ack(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"regions": ["us-east-1"]}}},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == {
        "version": 2,
        "inSync": False,
        "regions": {"us-east-1": {"state": "enabled"}, "us-west-2": {"state": "disabled"}},
    }, "removed region should be marked disabled and the version bumped"

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=2)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == {
        "version": 2,
        "inSync": True,
        "regions": {"us-east-1": {"state": "enabled"}},
    }, "acked removed region should be dropped"


def test_sync_state_keeps_removed_region_without_ack(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """The agent failed to clean up or crashed, so it never acks: the removed region stays and the version stays put."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"regions": ["us-east-1"]}}},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    for _ in range(3):
        response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["syncState"] == {
            "version": 2,
            "inSync": False,
            "regions": {"us-east-1": {"state": "enabled"}, "us-west-2": {"state": "disabled"}},
        }, "unacked removed region should stay without bumping the version"


@pytest.mark.parametrize("synced_version", [2, 9], ids=["stale", "ahead"])
def test_sync_state_ignores_mismatched_ack(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    synced_version: int,
) -> None:
    """An ack for any version other than the current one (v3) is ignored,
    so us-west-2, removed at v2 and still unacked, is not dropped.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    for regions in (["us-east-1"], ["us-east-1", "eu-west-1"]):
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"config": {"aws": {"regions": regions}}},
            timeout=10,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
        assert response.status_code == HTTPStatus.OK, response.text

    expected_sync_state = {
        "version": 3,
        "inSync": False,
        "regions": {"us-east-1": {"state": "enabled"}, "us-west-2": {"state": "disabled"}, "eu-west-1": {"state": "enabled"}},
    }
    assert response.json()["data"]["syncState"] == expected_sync_state

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=synced_version)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == expected_sync_state, "an ack for another version should be ignored"


def test_sync_state_applies_ack_before_config_change(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """The user changes regions while the agent syncs: the ack for the version it synced still lands."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    for regions, synced_version in ((["us-east-1"], None), (["us-east-1", "eu-west-1"], 2)):
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"config": {"aws": {"regions": regions}}},
            timeout=10,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=synced_version)
        assert response.status_code == HTTPStatus.OK, response.text

    assert response.json()["data"]["syncState"] == {
        "version": 3,
        "inSync": False,
        "regions": {"us-east-1": {"state": "enabled"}, "eu-west-1": {"state": "enabled"}},
    }, "ack should drop the removed region before the new region bumps the version"


@pytest.mark.parametrize("synced_version", [1, None], ids=["agent_acks_synced_version", "agent_crashed"])
def test_sync_state_region_removed_during_sync(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    synced_version: int | None,
) -> None:
    """The user removes a region while the agent syncs v1; whether the agent acks v1 or crashed, the region must not be lost."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == {
        "version": 1,
        "inSync": True,
        "regions": {"us-east-1": {"state": "enabled"}, "us-west-2": {"state": "enabled"}},
    }

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"regions": ["us-east-1"]}}},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=synced_version)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == {
        "version": 2,
        "inSync": False,
        "regions": {"us-east-1": {"state": "enabled"}, "us-west-2": {"state": "disabled"}},
    }, "region removed mid-sync should be marked disabled"

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=2)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["syncState"] == {
        "version": 2,
        "inSync": True,
        "regions": {"us-east-1": {"state": "enabled"}},
    }


def test_sync_state_after_disconnect_when_provider_account_id_is_reused(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """The old AWS agent can finish cleanup while its provider ID belongs to a replacement integration."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    provider_account_id = str(uuid.uuid4())

    response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    replacement_id = create_cloud_integration_account(admin_token, "aws", regions=["us-east-1", "us-west-2"])["id"]
    response = simulate_agent_checkin(signoz, admin_token, "aws", replacement_id, provider_account_id)
    assert response.status_code == HTTPStatus.OK, response.text

    for _ in range(2):
        response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id)
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["removedAt"] is not None, "removedAt should be set after disconnect"
        assert response.json()["data"]["syncState"] == {
            "version": 2,
            "inSync": False,
            "regions": {"us-east-1": {"state": "disabled"}, "us-west-2": {"state": "disabled"}},
        }, "every region should be disabled once, without bumping the version on later check-ins"

    for _ in range(2):
        response = simulate_agent_checkin(signoz, admin_token, "aws", account_id, provider_account_id, synced_version=2)
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["syncState"] == {"version": 2, "inSync": True, "regions": {}}, "acked removal should leave no regions"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/aws/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["agentReport"]["syncState"] == {"version": 2, "inSync": True, "regions": {}}, "cleanup acknowledgment must be saved"
