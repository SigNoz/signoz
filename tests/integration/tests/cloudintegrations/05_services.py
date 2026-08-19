import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from sqlalchemy import bindparam, sql

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrations import (
    ProviderServiceSpec,
    simulate_agent_checkin,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

AWS_SERVICE_SPEC = ProviderServiceSpec(
    provider="aws",
    service_id="rds",
    supports_logs=True,
    account_config={"aws": {"deploymentRegion": "us-east-1", "regions": ["us-east-1"]}},
)

GCP_SERVICE_SPEC = ProviderServiceSpec(
    provider="gcp",
    service_id="cloudsql_postgres",
    supports_logs=False,
    account_config={
        "gcp": {
            "deploymentProjectId": "signoz-test-project",
            "deploymentRegion": "us-central1",
            "projectIds": ["signoz-test-project"],
        }
    },
)

PROVIDER_SERVICE_SPECS = [AWS_SERVICE_SPEC, GCP_SERVICE_SPEC]

provider_spec = pytest.mark.parametrize(
    "spec",
    PROVIDER_SERVICE_SPECS,
    ids=[s.id for s in PROVIDER_SERVICE_SPECS],
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
def test_list_services_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderServiceSpec,
) -> None:
    """List the cloud provider's supported services"""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/services"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert "services" in data, "Response should contain 'services' field"
    assert isinstance(data["services"], list), "services should be a list"
    assert len(data["services"]) > 0, "services list should be non-empty"

    service = data["services"][0]
    assert "id" in service, "Service should have 'id' field"
    assert "title" in service, "Service should have 'title' field"
    assert "icon" in service, "Service should have 'icon' field"
    assert "enabled" in service, "Service should have 'enabled' field"

    listed_ids = {s["id"] for s in data["services"]}
    assert spec.service_id in listed_ids, f"'{spec.service_id}' should be listed for {spec.provider}"


@provider_spec
def test_list_account_services(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """ListAccountServicesMetadata reflects enabled state per service."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    put_response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True)},
        timeout=10,
    )
    assert put_response.status_code == HTTPStatus.NO_CONTENT, f"Enable {spec.service_id} failed: {put_response.status_code}: {put_response.text}"

    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK, f"Expected 200, got {list_response.status_code}"

    data = list_response.json()["data"]
    assert "services" in data, "Response should contain 'services' field"
    assert isinstance(data["services"], list), "services should be a list"
    assert len(data["services"]) > 0, "services list should be non-empty"

    enabled_service = next((s for s in data["services"] if s["id"] == spec.service_id), None)
    assert enabled_service is not None, f"Service '{spec.service_id}' not found in services list"
    assert enabled_service["enabled"] is True, f"Service should be enabled, got: {enabled_service['enabled']}"

    # The listing must report state per service, not blanket-enable or echo the write.
    untouched_service = next((s for s in data["services"] if s["id"] != spec.service_id), None)
    assert untouched_service is not None, "Expected more than one service in the listing"
    assert untouched_service["enabled"] is False, f"Service '{untouched_service['id']}' was never enabled, got: {untouched_service['enabled']}"


@provider_spec
def test_get_service_details_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderServiceSpec,
) -> None:
    """Get full service definition without specifying an account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == spec.service_id, f"id should be '{spec.service_id}'"
    assert "title" in data, "Service should have 'title'"
    assert "overview" in data, "Service should have 'overview' (markdown)"
    assert "assets" in data, "Service should have 'assets'"
    assert isinstance(data["assets"]["dashboards"], list), "assets.dashboards should be a list"
    assert data["cloudIntegrationService"] is None, "cloudIntegrationService should be null without account context"

    assert data["supportedSignals"]["metrics"] is True, "metrics should be a supported signal"
    assert data["supportedSignals"]["logs"] is spec.supports_logs, f"logs support should be {spec.supports_logs} for {spec.provider}"


@provider_spec
def test_get_account_service(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Get service for a specific account — all disabled by default."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == spec.service_id, f"id should be '{spec.service_id}'"
    assert data["cloudIntegrationService"] is None, "cloudIntegrationService should be null before any config is set"


@provider_spec
def test_get_service_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderServiceSpec,
) -> None:
    """Get a non-existent service ID returns 400 (invalid service ID is a bad request)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/services/non-existent-service"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400, got {response.status_code}"


@provider_spec
def test_update_service_config(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Enable a service and verify the config is persisted via GET."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    put_response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True)},
        timeout=10,
    )

    assert put_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {put_response.status_code}: {put_response.text}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert get_response.status_code == HTTPStatus.OK
    data = get_response.json()["data"]
    svc = data["cloudIntegrationService"]
    assert svc is not None, "cloudIntegrationService should be non-null after UpdateService"
    assert svc["config"][spec.provider]["metrics"]["enabled"] is True, "metrics should be enabled"
    assert svc["cloudIntegrationId"] == account_id, "cloudIntegrationId should match the account"

    if spec.supports_logs:
        assert svc["config"][spec.provider]["logs"]["enabled"] is True, "logs should be enabled"
    else:
        assert svc["config"][spec.provider].get("logs") is None, f"logs should not be stored for {spec.provider}, got: {svc['config'][spec.provider]}"


@provider_spec
def test_update_service_config_disable(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Enable then disable a service — config change is persisted."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    endpoint = signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}")

    # Enable
    r = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True)},
        timeout=10,
    )
    assert r.status_code == HTTPStatus.NO_CONTENT, f"Enable failed: {r.status_code}: {r.text}"

    # Disable
    r = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(False)},
        timeout=10,
    )
    assert r.status_code == HTTPStatus.NO_CONTENT, f"Disable failed: {r.status_code}: {r.text}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert get_response.status_code == HTTPStatus.OK
    svc = get_response.json()["data"]["cloudIntegrationService"]
    assert svc is not None, "cloudIntegrationService should still be present after disable"
    assert svc["config"][spec.provider]["metrics"]["enabled"] is False, "metrics should be disabled"

    if spec.supports_logs:
        assert svc["config"][spec.provider]["logs"]["enabled"] is False, "logs should be disabled"


@provider_spec
def test_update_service_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    spec: ProviderServiceSpec,
) -> None:
    """PUT with a non-existent account UUID returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{uuid.uuid4()}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True)},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


def test_update_gcp_service_without_metrics_config(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """GCP services support metrics only, so a config omitting metrics is rejected."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, "gcp", config=GCP_SERVICE_SPEC.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, "gcp", account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/gcp/accounts/{account_id}/services/{GCP_SERVICE_SPEC.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"gcp": {"logs": {"enabled": True}}}},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400 when metrics config is missing, got {response.status_code}: {response.text}"


def test_list_services_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """List services for an unsupported cloud provider returns 400."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/cloud_integrations/unknown/services"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400, got {response.status_code}"


@provider_spec
def test_list_services_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """List services for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert delete_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


@provider_spec
def test_get_service_details_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Get service details for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert delete_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


@provider_spec
def test_update_service_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """PUT service config for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert delete_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True)},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


@provider_spec
def test_enable_metrics_provisions_dashboards(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Enabling metrics provisions dashboards visible in GetService and present in the DB."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    put_response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True, logs_enabled=False)},
        timeout=10,
    )
    assert put_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {put_response.status_code}: {put_response.text}"

    # Assertion 1: GetService returns provisioned dashboard UUIDs
    get_svc_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert get_svc_response.status_code == HTTPStatus.OK, f"Expected 200, got {get_svc_response.status_code}: {get_svc_response.text}"

    data = get_svc_response.json()["data"]
    svc = data["cloudIntegrationService"]
    assert svc is not None, "cloudIntegrationService should be non-null after enabling metrics"
    assert svc["config"][spec.provider]["metrics"]["enabled"] is True

    dashboards_in_service = data["assets"]["dashboards"]
    assert isinstance(dashboards_in_service, list) and len(dashboards_in_service) > 0, "assets.dashboards should be non-empty after enabling metrics"
    provisioned_ids = set()
    for dash in dashboards_in_service:
        assert "integrationDashboard" in dash, "Integration dashboard entry missing"
        try:
            uuid.UUID(dash["integrationDashboard"]["id"])
        except ValueError as err:
            raise AssertionError(f"Dashboard id '{dash['integrationDashboard']['id']}' is not a UUID — dashboard was not provisioned") from err
        provisioned_ids.add(dash["integrationDashboard"]["dashboardId"])

    # Assertion 2: Provisioned dashboard IDs are present in the DB
    with signoz.sqlstore.conn.connect() as conn:
        rows = (
            conn.execute(
                sql.text("SELECT id FROM dashboard WHERE id IN :ids").bindparams(bindparam("ids", expanding=True)),
                {"ids": list(provisioned_ids)},
            )
            .mappings()
            .fetchall()
        )

    db_ids = {row["id"] for row in rows}
    assert provisioned_ids == db_ids, f"Dashboards {provisioned_ids - db_ids} are missing from the DB"


@provider_spec
def test_disable_metrics_deprovisions_dashboards(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderServiceSpec,
) -> None:
    """Disabling metrics removes provisioned dashboards from both GetService and the dashboards list."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, spec.provider, config=spec.account_config)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, spec.provider, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    endpoint = signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}")

    # Enable metrics to provision dashboards first
    enable_response = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(True, logs_enabled=False)},
        timeout=10,
    )
    assert enable_response.status_code == HTTPStatus.NO_CONTENT, f"Enable failed: {enable_response.status_code}: {enable_response.text}"

    # Capture the provisioned dashboard IDs before disabling
    get_svc_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert get_svc_response.status_code == HTTPStatus.OK
    provisioned_ids = {d["integrationDashboard"]["dashboardId"] for d in get_svc_response.json()["data"]["assets"]["dashboards"]}
    assert len(provisioned_ids) > 0, "Expected dashboards to be provisioned after enabling metrics"

    # Disable metrics
    disable_response = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": spec.build_service_config(False)},
        timeout=10,
    )
    assert disable_response.status_code == HTTPStatus.NO_CONTENT, f"Disable failed: {disable_response.status_code}: {disable_response.text}"

    # Assertion 1: GetService no longer returns UUID dashboard IDs
    get_svc_after = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{spec.provider}/accounts/{account_id}/services/{spec.service_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert get_svc_after.status_code == HTTPStatus.OK
    dashboards_after = get_svc_after.json()["data"]["assets"]["dashboards"]
    for dash in dashboards_after:
        try:
            uuid.UUID(dash.get("id", ""))
            raise AssertionError(f"Dashboard '{dash['id']}' still has a provisioned UUID after disabling metrics")
        except ValueError:
            pass  # expected — ID is not a UUID, meaning the dashboard was deprovisioned

    # Assertion 2: Dashboards listing API no longer contains the provisioned dashboard IDs
    list_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/dashboards?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK, f"Expected 200 from dashboards list, got {list_response.status_code}: {list_response.text}"

    listed_ids = {d["id"] for d in list_response.json()["data"]["dashboards"]}
    assert not provisioned_ids & listed_ids, f"Provisioned dashboard IDs {provisioned_ids & listed_ids} still appear in dashboards list after disabling metrics"
