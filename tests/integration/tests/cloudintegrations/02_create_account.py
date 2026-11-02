from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrations import ProviderAccountSpec, simulate_agent_checkin
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

AWS_ACCOUNT_SPEC = ProviderAccountSpec(
    provider="aws",
    initial_params={"deployment_region": "us-east-1", "regions": ["us-east-1", "us-west-2"]},
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


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


@provider_spec
def test_create_account(
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
    spec: ProviderAccountSpec,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    data = create_cloud_integration_account(
        admin_token,
        spec.provider,
        config=spec.build_config(spec.initial_params),
    )

    assert "id" in data, "Response data should contain 'id' field"
    assert len(data["id"]) > 0, "id should be a non-empty UUID string"

    assert "connectionArtifact" in data, "Response data should contain 'connectionArtifact' field"
    artifact = data["connectionArtifact"]

    if spec.provider == "aws":
        assert "aws" in artifact, "connectionArtifact should contain 'aws' field"
        assert "connectionUrl" in artifact["aws"], "connectionArtifact.aws should contain 'connectionUrl'"

        connection_url = artifact["aws"]["connectionUrl"]
        assert "console.aws.amazon.com/cloudformation" in connection_url, "connectionUrl should be an AWS CloudFormation URL"
        assert f"region={spec.initial_params['deployment_region']}" in connection_url, "connectionUrl should contain the deployment region"
    else:
        # GCP is a manual flow: no one-click install artifact.
        assert artifact.get("gcp") is None, f"GCP should not return a connection artifact, got: {artifact}"


def test_create_gcp_manual_account_connection_method(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Manual accounts retain the explicitly selected projects."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    config = {
        "connectionMethod": "manual",
        "deploymentProjectId": "signoz-test-project",
        "deploymentRegion": "us-central1",
        "projectIds": ["signoz-test-project", "signoz-test-project-2"],
    }
    account = create_cloud_integration_account(admin_token, "gcp", config={"gcp": config})
    assert account["connectionArtifact"].get("gcp") is None

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/gcp/accounts/{account['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["gcp"] == config

    checkin = simulate_agent_checkin(signoz, admin_token, "gcp", account["id"], "manual-account")
    assert checkin.status_code == HTTPStatus.OK, checkin.text
    assert checkin.json()["data"]["integrationConfig"] == {}


@pytest.mark.parametrize(
    "config_changes,omitted_field,error_field",
    [
        pytest.param({}, "connectionMethod", "connectionMethod", id="missing_connection_method"),
        pytest.param({"connectionMethod": None}, None, "connectionMethod", id="null_connection_method"),
        pytest.param({"connectionMethod": ""}, None, "connectionMethod", id="empty_connection_method"),
        pytest.param({"connectionMethod": "   "}, None, "connectionMethod", id="blank_connection_method"),
        pytest.param({"connectionMethod": "unsupported"}, None, "connectionMethod", id="unsupported_connection_method"),
        *[pytest.param({"connectionMethod": method}, "projectIds", "projectIds", id=f"{method}_missing_project_ids") for method in ("manual", "agent")],
        *[
            pytest.param({"connectionMethod": method, "projectIds": project_ids}, None, "projectIds", id=f"{method}_{case}")
            for method in ("manual", "agent")
            for case, project_ids in (
                ("null_project_ids", None),
                ("empty_project_ids", []),
                ("empty_project_id", [""]),
                ("blank_project_id", ["   "]),
                ("padded_project_id", [" signoz-validation-project "]),
            )
        ],
        pytest.param({"connectionMethod": "agent", "projectIds": ["signoz-other-project"]}, None, "projectIds", id="agent_mismatched_project"),
        pytest.param({"connectionMethod": "agent", "projectIds": ["signoz-validation-project", "signoz-other-project"]}, None, "projectIds", id="agent_multiple_projects"),
        pytest.param({"deploymentProjectId": " signoz-validation-project "}, None, "deploymentProjectId", id="padded_deployment_project"),
    ],
)
def test_create_gcp_account_rejects_invalid_config(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    config_changes: dict,
    omitted_field: str | None,
    error_field: str,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    config = {
        "connectionMethod": "manual",
        "deploymentProjectId": "signoz-validation-project",
        "deploymentRegion": "us-central1",
        "projectIds": ["signoz-validation-project"],
    } | config_changes
    if omitted_field is not None:
        del config[omitted_field]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/cloud_integrations/gcp/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {"gcp": config},
            "credentials": {
                "sigNozApiUrl": "https://test-deployment.test.signoz.cloud",
                "sigNozApiKey": "test-api-key-789",
                "ingestionUrl": "https://ingest.test.signoz.cloud",
                "ingestionKey": "test-ingestion-key-123456",
            },
        },
        timeout=10,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert error_field in response.text


def test_create_gcp_agent_account_connection_command(
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    account = create_cloud_integration_account(
        admin_token,
        "gcp",
        config={"gcp": {"connectionMethod": "agent", "deploymentProjectId": "signoz-agent-project", "deploymentRegion": "us-central1", "projectIds": ["signoz-agent-project"]}},
    )
    artifact = account["connectionArtifact"]["gcp"]
    assert set(artifact) == {"cliCommand"}

    command = artifact["cliCommand"]
    assert command.startswith("curl -fsSL 'https://signoz.io/foundry.sh' | bash -s -- cloudintegration gcp terraform")
    assert "--region 'us-central1'" in command
    assert "--gcp-project 'signoz-agent-project'" in command
    assert f"--integration-account-id '{account['id']}'" in command
    assert "--signoz-api-url 'https://test-deployment.test.signoz.cloud'" in command
    assert "--signoz-api-key 'test-api-key-789'" in command
    assert "--ingestion-url 'https://ingest.test.signoz.cloud'" in command
    assert "--ingestion-key 'test-ingestion-key-123456'" in command
    assert "--agent-version 'v0.0.8'" in command


def test_create_account_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "unknown"
    endpoint = f"/api/v1/cloud_integrations/{cloud_provider}/accounts"

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {"unknown": {"deploymentRegion": "us-central1", "regions": ["us-central1"]}},
            "credentials": {
                "sigNozApiURL": "https://test.signoz.cloud",
                "sigNozApiKey": "test-key",
                "ingestionUrl": "https://ingest.test.signoz.cloud",
                "ingestionKey": "test-ingestion-key",
            },
        },
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400 for unsupported provider, got {response.status_code}"

    response_data = response.json()
    assert "error" in response_data, "Response should contain 'error' field"


def test_create_gcp_account_without_project_ids(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """GCP account config requires at least one project ID to monitor."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/cloud_integrations/gcp/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {
                "gcp": {
                    "connectionMethod": "manual",
                    "deploymentProjectId": "signoz-test-project",
                    "deploymentRegion": "us-central1",
                    "projectIds": [],
                }
            },
            "credentials": {
                "sigNozApiURL": "https://test.signoz.cloud",
                "sigNozApiKey": "test-key",
                "ingestionUrl": "https://ingest.test.signoz.cloud",
                "ingestionKey": "test-ingestion-key",
            },
        },
        timeout=10,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, f"Expected 400 for empty projectIds, got {response.status_code}: {response.text}"
    assert "error" in response.json(), "Response should contain 'error' field"
