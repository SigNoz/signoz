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
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.role import transaction_group

user_password = "password123Z$"
scoped_role = "infra-scope-key-a"
scoped_email = "infra-scope-key-a@telemetry.test"
wildcard_role = "infra-wildcard"
wildcard_email = "infra-wildcard@telemetry.test"

list_paths = [
    "/api/v2/infra_monitoring/hosts",
    "/api/v2/infra_monitoring/pods",
    "/api/v2/infra_monitoring/kube_containers",
    "/api/v2/infra_monitoring/nodes",
    "/api/v2/infra_monitoring/namespaces",
    "/api/v2/infra_monitoring/clusters",
    "/api/v2/infra_monitoring/pvcs",
    "/api/v2/infra_monitoring/deployments",
    "/api/v2/infra_monitoring/statefulsets",
    "/api/v2/infra_monitoring/jobs",
    "/api/v2/infra_monitoring/daemonsets",
]


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


@pytest.mark.parametrize("path", list_paths)
@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.OK), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
)
def test_list_routes(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    path: str,
    email: str,
    expected: HTTPStatus,
) -> None:
    now = datetime.now(tz=UTC)
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)
    response = requests.post(
        signoz.self.host_configs["8080"].get(path),
        json={"start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 10},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text


def test_list_denied_message_names_metrics_wildcard(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/infra_monitoring/hosts"),
        json={"start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 10, "filter": {"expression": "host.name = 'web-1'"}},
        headers={"Authorization": f"Bearer {get_token(scoped_email, user_password)}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "builder_query/*" in response.text


@pytest.mark.parametrize(
    ("email", "expression", "expected", "expected_hosts"),
    [
        (scoped_email, "signoz.workspace.key.id = 'key-a'", HTTPStatus.OK, {"acc-h1"}),
        (scoped_email, "signoz.workspace.key.id = 'key-b'", HTTPStatus.FORBIDDEN, set()),
        (scoped_email, "signoz.workspace.key.id IN ('key-a', 'key-b')", HTTPStatus.FORBIDDEN, set()),
        (wildcard_email, None, HTTPStatus.OK, {"acc-h1", "acc-h2"}),
    ],
    ids=["scoped_granted_key", "scoped_other_key", "scoped_both_keys", "wildcard_unfiltered"],
)
def test_hosts_scoped_read(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    email: str,
    expression: str | None,
    expected: HTTPStatus,
    expected_hosts: set[str],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        [Metrics.from_dict({**metric.to_dict(), "labels": {**metric.labels, "signoz.workspace.key.id": "key-a" if metric.labels["host.name"] == "acc-h1" else "key-b"}}) for metric in Metrics.load_from_file(get_testdata_file_path("inframonitoring/hosts_value_accuracy.jsonl"), base_time=now - timedelta(minutes=4))]
    )

    body: dict = {"start": int((now - timedelta(minutes=5)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    if expression:
        body["filter"] = {"expression": expression}
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/infra_monitoring/hosts"),
        json=body,
        headers={"Authorization": f"Bearer {get_token(email, user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.OK:
        assert {record["hostName"] for record in response.json()["data"]["records"]} == expected_hosts


@pytest.mark.parametrize(
    ("email", "expected"),
    [(scoped_email, HTTPStatus.FORBIDDEN), (wildcard_email, HTTPStatus.OK), (USER_ADMIN_EMAIL, HTTPStatus.OK)],
)
def test_checks(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    expected: HTTPStatus,
) -> None:
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/infra_monitoring/checks"),
        params={"type": "hosts"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
