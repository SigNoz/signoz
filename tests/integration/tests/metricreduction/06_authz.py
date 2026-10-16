from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
)
from fixtures.role import transaction_group

user_password = "password123Z$"
scoped_role = "metric-reduction-scope-key-a"
scoped_email = "metric-reduction-scope-key-a@telemetry.test"
wildcard_role = "metric-reduction-wildcard"
wildcard_email = "metric-reduction-wildcard@telemetry.test"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_role(admin_token, scoped_role, [transaction_group("read", "telemetryresource", "metrics", ["builder_query/signoz.workspace.key.id/key-a"])])
    scoped_user = create_active_user(signoz, admin_token, email=scoped_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, scoped_user, "signoz-viewer", scoped_role)

    create_role(admin_token, wildcard_role, [transaction_group("read", "telemetryresource", "metrics", ["builder_query/*"])])
    wildcard_user = create_active_user(signoz, admin_token, email=wildcard_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, wildcard_user, "signoz-viewer", wildcard_role)


@pytest.mark.parametrize("path", ["/api/v2/metric_reduction_rules/stats", "/api/v2/metric_reduction_rules/timeseries"], ids=["stats", "timeseries"])
@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.OK), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
    ids=["scoped", "wildcard", "admin"],
)
def test_volume_routes(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    path: str,
    email: str,
    expected: HTTPStatus,
) -> None:
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)
    response = requests.get(
        signoz.self.host_configs["8080"].get(path),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if email == scoped_email:
        assert "builder_query/*" in response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.FORBIDDEN), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
    ids=["scoped", "wildcard", "admin"],
)
def test_preview_stays_admin_only(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    expected: HTTPStatus,
) -> None:
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metric_reduction_rules/preview"),
        json={"metricName": "reduction.preview", "matchType": "drop", "labels": ["host.name"]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
