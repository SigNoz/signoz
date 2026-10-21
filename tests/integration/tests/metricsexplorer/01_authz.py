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
scoped_role = "metrics-explorer-scope-key-a"
scoped_email = "metrics-explorer-scope-key-a@telemetry.test"
wildcard_role = "metrics-explorer-wildcard"
wildcard_email = "metrics-explorer-wildcard@telemetry.test"
metadata_role = "metrics-explorer-metadata-reader"
metadata_email = "metrics-explorer-metadata-reader@telemetry.test"
viewer_email = "metrics-explorer-viewer@telemetry.test"
editor_email = "metrics-explorer-editor@telemetry.test"


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
        metadata_role,
        [transaction_group("read", "metaresource", "metrics-field", ["*"]), transaction_group("list", "metaresource", "metrics-field", ["*"])],
    )
    metadata_user = create_active_user(signoz, admin_token, email=metadata_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, metadata_user, "signoz-viewer", metadata_role)

    create_active_user(signoz, admin_token, email=viewer_email, role="signoz-viewer", password=user_password)
    create_active_user(signoz, admin_token, email=editor_email, role="signoz-editor", password=user_password)


@pytest.mark.parametrize(
    ("method", "path", "query", "body"),
    [
        ("POST", "/api/v2/metrics/stats", None, {"limit": 10}),
        ("POST", "/api/v2/metrics/treemap", None, {"limit": 10, "mode": "samples"}),
        ("GET", "/api/v2/metrics/highlights", {"metricName": "explorer.requests"}, None),
        ("POST", "/api/v2/metrics/inspect", None, {"metricName": "explorer.requests"}),
        ("GET", "/api/v2/metrics/onboarding", {}, None),
    ],
    ids=["stats", "treemap", "highlights", "inspect", "onboarding"],
)
@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (metadata_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.OK), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
    ids=["scoped", "metadata_reader", "wildcard", "admin"],
)
def test_telemetry_routes_without_filter(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    method: str,
    path: str,
    query: dict | None,
    body: dict | None,
    email: str,
    expected: HTTPStatus,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name="explorer.requests", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)])
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.request(
        method,
        signoz.self.host_configs["8080"].get(path),
        params={"start": start, "end": end, **query} if query is not None else None,
        json={"start": start, "end": end, **body} if body is not None else None,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text


@pytest.mark.parametrize(
    ("path", "query"),
    [
        ("/api/v2/metrics", {"limit": 10}),
        ("/api/v2/metrics/attributes", {"metricName": "explorer.requests"}),
        ("/api/v2/metrics/metadata", {"metricName": "explorer.requests"}),
    ],
    ids=["list", "attributes", "metadata"],
)
@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (scoped_email, HTTPStatus.FORBIDDEN),
        (wildcard_email, HTTPStatus.FORBIDDEN),
        (metadata_email, HTTPStatus.OK),
        (viewer_email, HTTPStatus.OK),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["metrics_scoped", "metrics_wildcard", "metadata_reader", "viewer", "admin"],
)
def test_metadata_reads_need_metadata_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    path: str,
    query: dict,
    email: str,
    expected: HTTPStatus,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name="explorer.requests", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)])
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.get(
        signoz.self.host_configs["8080"].get(path),
        params={"start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), **query},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "metrics-field" in response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (scoped_email, HTTPStatus.FORBIDDEN),
        (metadata_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.FORBIDDEN),
        (editor_email, HTTPStatus.OK),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["metrics_scoped", "metadata_reader", "viewer", "editor", "admin"],
)
def test_metadata_update_needs_update_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    email: str,
    expected: HTTPStatus,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name="explorer.requests", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)])
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metrics/metadata"),
        json={"metricName": "explorer.requests", "type": "sum", "description": "request count", "unit": "1", "temporality": "cumulative", "isMonotonic": True},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text


@pytest.mark.parametrize(
    ("email", "expression", "expected", "expected_metrics"),
    [
        (scoped_email, "signoz.workspace.key.id = 'key-a'", HTTPStatus.OK, {"explorer.key.a"}),
        (scoped_email, "signoz.workspace.key.id = 'key-b'", HTTPStatus.FORBIDDEN, set()),
        (scoped_email, "signoz.workspace.key.id IN ('key-a', 'key-b')", HTTPStatus.FORBIDDEN, set()),
        (wildcard_email, None, HTTPStatus.OK, {"explorer.key.a", "explorer.key.b"}),
    ],
    ids=["scoped_granted_key", "scoped_other_key", "scoped_both_keys", "wildcard_unfiltered"],
)
def test_stats_scoped_read(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    email: str,
    expression: str | None,
    expected: HTTPStatus,
    expected_metrics: set[str],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        [Metrics(metric_name="explorer.key.a", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)]
        + [Metrics(metric_name="explorer.key.b", labels={"signoz.workspace.key.id": "key-b"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)]
    )

    body: dict = {"start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    if expression:
        body["filter"] = {"expression": expression}
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/metrics/stats"),
        json=body,
        headers={"Authorization": f"Bearer {get_token(email, user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.OK:
        assert {stat["metricName"] for stat in response.json()["data"]["metrics"]} == expected_metrics


@pytest.mark.parametrize(
    ("path", "body"),
    [
        ("/api/v2/metrics/treemap", {"limit": 10, "mode": "samples"}),
        ("/api/v2/metrics/inspect", {"metricName": "explorer.key.a"}),
    ],
    ids=["treemap", "inspect"],
)
def test_filtered_routes_allow_granted_key(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    path: str,
    body: dict,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name="explorer.key.a", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)])
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(scoped_email, user_password)

    allowed = requests.post(
        signoz.self.host_configs["8080"].get(path),
        json={"start": start, "end": end, "filter": {"expression": "signoz.workspace.key.id = 'key-a'"}, **body},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert allowed.status_code == HTTPStatus.OK, allowed.text

    denied = requests.post(
        signoz.self.host_configs["8080"].get(path),
        json={"start": start, "end": end, "filter": {"expression": "signoz.workspace.key.id = 'key-b'"}, **body},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert denied.status_code == HTTPStatus.FORBIDDEN, denied.text
    assert "builder_query/signoz.workspace.key.id/key-b" in denied.text


@pytest.mark.parametrize(
    ("path", "scope"),
    [("/api/v2/metrics/alerts", "rule:list"), ("/api/v3/metrics/dashboards", "dashboard:list")],
    ids=["alerts", "dashboards"],
)
@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.FORBIDDEN), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
    ids=["metrics_scoped", "metrics_wildcard", "admin"],
)
def test_metaresource_lookups_need_list_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    path: str,
    scope: str,
    email: str,
    expected: HTTPStatus,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name="explorer.requests", labels={"signoz.workspace.key.id": "key-a"}, timestamp=now - timedelta(minutes=i + 1), value=float(i)) for i in range(3)])
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)
    response = requests.get(
        signoz.self.host_configs["8080"].get(path),
        params={"metricName": "explorer.requests"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert scope.split(":", maxsplit=1)[0] in response.text
