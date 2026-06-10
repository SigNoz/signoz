from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD

ORG_CONTEXT_PATH = "/api/v1/empty_state/org_context"


def test_get_org_context_unauthenticated(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
):
    response = requests.get(
        signoz.self.host_configs["8080"].get(ORG_CONTEXT_PATH),
        timeout=2,
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_get_org_context_without_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(ORG_CONTEXT_PATH),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    assert isinstance(data["hasIngestedData"], bool)
    assert isinstance(data["hasInfraMetrics"], bool)
    # Fresh stack has no telemetry, so every last-ingested timestamp is null.
    assert data["lastIngestedAt"]["logs"] is None
    assert data["lastIngestedAt"]["traces"] is None
    assert data["lastIngestedAt"]["metrics"] is None
    assert data["hasIngestedData"] is False
    assert data["alertsCount"] == 0
    assert data["dashboardsCount"] == 0
    assert data["savedViewsCount"] == 0
    # No license registered yet, so the sentinel is returned.
    assert data["licenseStatus"] == "UNKNOWN"


def test_get_org_context_with_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(ORG_CONTEXT_PATH),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK
    # The Zeus mock issues a license with state EVALUATING; the API passes it
    # through verbatim rather than mapping it to a trial/paid vocabulary.
    assert response.json()["data"]["licenseStatus"] == "EVALUATING"
