from collections.abc import Callable
from datetime import UTC, datetime, timedelta
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
from fixtures.metrics import Metrics
from fixtures.role import transaction_group

user_password = "password123Z$"
scoped_role = "metric-reduction-scope-key-a"
scoped_email = "metric-reduction-scope-key-a@telemetry.test"
wildcard_role = "metric-reduction-wildcard"
wildcard_email = "metric-reduction-wildcard@telemetry.test"
rule_reader_role = "metric-reduction-rule-reader"
rule_reader_email = "metric-reduction-rule-reader@telemetry.test"
viewer_email = "metric-reduction-viewer@telemetry.test"
editor_email = "metric-reduction-editor@telemetry.test"

rule_body = {"metricName": "reduction.requests", "matchType": "drop", "labels": ["host.name"]}


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

    create_role(
        admin_token,
        rule_reader_role,
        [transaction_group("read", "metaresource", "metric-reduction-rule", ["*"]), transaction_group("list", "metaresource", "metric-reduction-rule", ["*"])],
    )
    rule_reader = create_active_user(signoz, admin_token, email=rule_reader_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, rule_reader, "signoz-viewer", rule_reader_role)

    create_active_user(signoz, admin_token, email=viewer_email, role="signoz-viewer", password=user_password)
    create_active_user(signoz, admin_token, email=editor_email, role="signoz-editor", password=user_password)


@pytest.mark.parametrize("path", ["/api/v2/metric_reduction_rules/stats", "/api/v2/metric_reduction_rules/timeseries"], ids=["stats", "timeseries"])
@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (scoped_email, HTTPStatus.FORBIDDEN),
        (wildcard_email, HTTPStatus.OK),
        (rule_reader_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.OK),
        (editor_email, HTTPStatus.OK),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["metrics_scoped", "metrics_wildcard", "rule_reader", "viewer", "editor", "admin"],
)
def test_volume_routes_need_metrics_read(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    path: str,
    email: str,
    expected: HTTPStatus,
) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get(path), headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"}, timeout=10)
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "metrics" in response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (scoped_email, HTTPStatus.FORBIDDEN),
        (wildcard_email, HTTPStatus.FORBIDDEN),
        (rule_reader_email, HTTPStatus.OK),
        (viewer_email, HTTPStatus.OK),
        (editor_email, HTTPStatus.OK),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["metrics_scoped", "metrics_wildcard", "rule_reader", "viewer", "editor", "admin"],
)
def test_list_needs_rule_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    expected: HTTPStatus,
) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v2/metric_reduction_rules"), headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"}, timeout=10)
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "metric-reduction-rule" in response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (rule_reader_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.FORBIDDEN),
        (editor_email, HTTPStatus.FORBIDDEN),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["rule_reader", "viewer", "editor", "admin"],
)
def test_preview_needs_create_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    email: str,
    expected: HTTPStatus,
) -> None:
    insert_metrics([Metrics(metric_name=rule_body["metricName"], labels={"host.name": f"host-{i}"}, timestamp=datetime.now(tz=UTC) - timedelta(minutes=i + 1), value=0.5, type_="Gauge", is_monotonic=False) for i in range(3)])
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metric_reduction_rules/preview"),
        json=rule_body,
        headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (rule_reader_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.FORBIDDEN),
        (editor_email, HTTPStatus.FORBIDDEN),
        (USER_ADMIN_EMAIL, HTTPStatus.CREATED),
    ],
    ids=["rule_reader", "viewer", "editor", "admin"],
)
def test_create_needs_create_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    email: str,
    expected: HTTPStatus,
) -> None:
    insert_metrics([Metrics(metric_name="reduction.create", labels={"host.name": f"host-{i}"}, timestamp=datetime.now(tz=UTC) - timedelta(minutes=i + 1), value=0.5, type_="Gauge", is_monotonic=False) for i in range(3)])
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metric_reduction_rules"),
        json={**rule_body, "metricName": "reduction.create"},
        headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.CREATED:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/metric_reduction_rules/{response.json()['data']['id']}"),
            headers={"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"},
            timeout=10,
        )


def test_rule_instance_routes(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    insert_metrics([Metrics(metric_name="reduction.instance", labels={"host.name": f"host-{i}"}, timestamp=datetime.now(tz=UTC) - timedelta(minutes=i + 1), value=0.5, type_="Gauge", is_monotonic=False) for i in range(3)])
    created = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metric_reduction_rules"),
        json={**rule_body, "metricName": "reduction.instance"},
        headers={"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"},
        timeout=10,
    )
    assert created.status_code == HTTPStatus.CREATED, created.text
    rule_url = signoz.self.host_configs["8080"].get(f"/api/v2/metric_reduction_rules/{created.json()['data']['id']}")

    for email, expected in [(scoped_email, HTTPStatus.FORBIDDEN), (rule_reader_email, HTTPStatus.OK), (viewer_email, HTTPStatus.OK)]:
        read = requests.get(rule_url, headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"}, timeout=10)
        assert read.status_code == expected, read.text

    for email in [rule_reader_email, viewer_email, editor_email]:
        updated = requests.put(rule_url, json={"matchType": "keep", "labels": ["host.name"]}, headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"}, timeout=10)
        assert updated.status_code == HTTPStatus.FORBIDDEN, updated.text
        deleted = requests.delete(rule_url, headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"}, timeout=10)
        assert deleted.status_code == HTTPStatus.FORBIDDEN, deleted.text

    updated = requests.put(rule_url, json={"matchType": "keep", "labels": ["host.name"]}, headers={"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}, timeout=10)
    assert updated.status_code == HTTPStatus.OK, updated.text
    deleted = requests.delete(rule_url, headers={"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}, timeout=10)
    assert deleted.status_code == HTTPStatus.NO_CONTENT, deleted.text
