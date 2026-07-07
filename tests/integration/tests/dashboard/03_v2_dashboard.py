import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/dashboards"
# v1 list returns every dashboard regardless of schema. v2 list converts each row
# to the perses schema and 501s if any stored dashboard isn't perses-schema, so
# listing for cleanup against a shared DB must go through v1.
V1_BASE_URL = "/api/v1/dashboards"


def _wipe_all_dashboards(signoz: SigNoz, token: str) -> None:
    response = requests.get(
        signoz.self.host_configs["8080"].get(V1_BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for dashboard in response.json()["data"]:
        metadata = (dashboard.get("data") or {}).get("metadata") or {}
        base = BASE_URL if metadata.get("schemaVersion") == "v6" else V1_BASE_URL
        del_res = requests.delete(
            signoz.self.host_configs["8080"].get(f"{base}/{dashboard['id']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert del_res.status_code == HTTPStatus.NO_CONTENT, del_res.text


# ─── failure cases (create no dashboards) ────────────────────────────────────


def test_create_rejects_wrong_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "dashboard_invalid_input"
    assert body["error"]["message"] == 'schemaVersion must be "v6", got ""'


def test_create_rejects_missing_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"schemaVersion": "v6"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    body = response.json()
    assert body["error"]["code"] == "dashboard_invalid_input"
    assert body["error"]["message"] == "name is required"


def test_create_rejects_non_dns_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "Not A Label",
            "spec": {"display": {"name": "Not A Label"}},
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"


def test_create_rejects_unknown_field(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "rejects-unknown",
            "spec": {"display": {"name": "Rejects Unknown"}},
            "tags": [],
            "unknownfield": "boom",
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "unknown field" in response.json()["error"]["message"]


def test_create_rejects_reserved_tag_key(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "rejects-reserved",
            "spec": {"display": {"name": "Rejects Reserved"}},
            "tags": [{"key": "source", "value": "x"}],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"


def test_create_rejects_too_many_tags(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    tags = [{"key": f"k{i}", "value": "v"} for i in range(11)]
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "too-many-tags",
            "spec": {"display": {"name": "Too Many"}},
            "tags": tags,
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"


def test_create_rejects_long_display_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Display names are bounded at 128 characters; one over must be rejected.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "long-display-name",
            "spec": {"display": {"name": "x" * 129}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "spec.display.name: dashboard name must be at most 128 characters" in response.json()["error"]["message"]


def test_create_rejects_invalid_grid_layout(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def panel(name: str) -> dict:
        return {
            "kind": "Panel",
            "spec": {
                "display": {"name": name},
                "plugin": {"kind": "signoz/TablePanel", "spec": {}},
                "queries": [
                    {
                        "kind": "time_series",
                        "spec": {
                            "plugin": {
                                "kind": "signoz/BuilderQuery",
                                "spec": {
                                    "name": "A",
                                    "signal": "logs",
                                    "aggregations": [{"expression": "count()"}],
                                },
                            }
                        },
                    }
                ],
            },
        }

    # Two grid items reference valid, distinct panels but share cells, so the
    # overlap is the only violation.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "rejects-overlap",
            "spec": {
                "display": {"name": "Rejects Overlap"},
                "panels": {"p1": panel("P1"), "p2": panel("P2")},
                "layouts": [
                    {
                        "kind": "Grid",
                        "spec": {
                            "items": [
                                {"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
                                {"x": 3, "y": 3, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p2"}},
                            ]
                        },
                    }
                ],
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "overlap" in response.json()["error"]["message"]

    # One panel placed by two grid items (side by side, so they clear the overlap
    # check first). The frontend keys grid items by panel id, so this is rejected.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "rejects-multiref",
            "spec": {
                "display": {"name": "Rejects Multiref"},
                "panels": {"p1": panel("P1")},
                "layouts": [
                    {
                        "kind": "Grid",
                        "spec": {
                            "items": [
                                {"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
                                {"x": 6, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
                            ]
                        },
                    }
                ],
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "already placed" in response.json()["error"]["message"]

    # More grid items than allowed. The item-count check runs before the
    # panel-ref check, so content-less items suffice here.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "rejects-too-many-items",
            "spec": {
                "display": {"name": "Rejects Too Many"},
                "layouts": [
                    {
                        "kind": "Grid",
                        "spec": {"items": [{"x": 0, "y": 0, "width": 1, "height": 1} for _ in range(101)]},
                    }
                ],
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "maximum" in response.json()["error"]["message"]


@pytest.mark.parametrize(
    "params",
    [
        {"sort": "bogus"},
        {"order": "bogus"},
        {"limit": -1},
        {"offset": -1},
    ],
)
def test_list_rejects_invalid_params(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    params: dict,
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params=params,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_list_invalid"


def test_get_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_get_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


def test_update_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        json={
            "schemaVersion": "v6",
            "name": "malformed-id",
            "spec": {"display": {"name": "Malformed Id"}},
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_update_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        json={
            "schemaVersion": "v6",
            "name": "missing-dashboard",
            "spec": {"display": {"name": "Missing Dashboard"}},
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


def test_delete_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_delete_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


def test_pin_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{uuid.uuid4()}/pins"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


# ─── lifecycle ───────────────────────────────────────────────────────────────
# A single end-to-end flow through create → get → list/filter/sort → pin →
# update → lock → delete.


def test_dashboard_v2_lifecycle(  # pylint: disable=too-many-locals,too-many-statements
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # The dashboard test files share this package's DB and it's reused across
    # runs, so start from a clean slate: delete every dashboard (which also clears
    # pins via the delete cascade). This test then owns the whole dashboard space
    # and asserts on global counts.
    _wipe_all_dashboards(signoz, token)

    dashboard_requests = [
        (
            "lc-alpha",
            "Alpha Overview",
            [{"key": "team", "value": "pulse"}, {"key": "env", "value": "prod"}],
        ),
        (
            "lc-beta",
            "Beta Overview",
            [{"key": "team", "value": "pulse"}, {"key": "env", "value": "dev"}],
        ),
        (
            "lc-gamma",
            "Gamma Storage",
            [{"key": "team", "value": "storage"}, {"key": "env", "value": "prod"}],
        ),
        (
            "lc-delta",
            "Delta Storage",
            [
                {"key": "team", "value": "storage"},
                {"key": "env", "value": "dev"},
                {"key": "tier", "value": "critical"},
            ],
        ),
        (
            "lc-epsilon",
            "Epsilon Metrics",
            [
                {"key": "team", "value": "metrics"},
                {"key": "env", "value": "staging"},
                {"key": "tier", "value": "critical"},
            ],
        ),
        (
            "lc-zeta",
            "Zeta Overview",
            [{"key": "team", "value": "pulse"}, {"key": "env", "value": "staging"}],
        ),
    ]

    # ── stage 1: create ──────────────────────────────────────────────────────
    ids: dict[str, str] = {}
    for name, display, tags in dashboard_requests:
        response = requests.post(
            signoz.self.host_configs["8080"].get(BASE_URL),
            json={
                "schemaVersion": "v6",
                "name": name,
                "spec": {"display": {"name": display}},
                "tags": tags,
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text
        ids[name] = response.json()["data"]["id"]

    # TODO: re-enable once the dashboard name unique index lands — creating a
    # second dashboard with an existing name should conflict (409). Until the
    # index exists, duplicate names are silently allowed.
    # response = requests.post(
    #     signoz.self.host_configs["8080"].get(_BASE),
    #     json={"schemaVersion": "v6", "name": "lc-alpha",
    #           "spec": {"display": {"name": "Alpha Dupe"}}, "tags": []},
    #     headers={"Authorization": f"Bearer {token}"},
    #     timeout=5,
    # )
    # assert response.status_code == HTTPStatus.CONFLICT, response.text

    # ── stage 2: get one and verify the round-tripped shape ──────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-alpha']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    alpha = response.json()["data"]
    assert alpha["id"] == ids["lc-alpha"]
    assert alpha["name"] == "lc-alpha"
    assert alpha["spec"]["display"]["name"] == "Alpha Overview"
    assert alpha["schemaVersion"] == "v6"
    assert alpha["source"] == "user"
    assert alpha["locked"] is False
    assert {"key": "team", "value": "pulse"} in alpha["tags"]

    # ── stage 3: list everything ─────────────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    body = response.json()
    assert body["data"]["total"] == 6
    assert {d["spec"]["display"]["name"] for d in body["data"]["dashboards"]} == {
        "Alpha Overview",
        "Beta Overview",
        "Gamma Storage",
        "Delta Storage",
        "Epsilon Metrics",
        "Zeta Overview",
    }
    # top-level tags = org-wide distinct tag set, sorted case-insensitively
    # by (key, value). Asserting the exact list (not a set) locks in the sort.
    assert body["data"]["tags"] == [
        {"key": "env", "value": "dev"},
        {"key": "env", "value": "prod"},
        {"key": "env", "value": "staging"},
        {"key": "team", "value": "metrics"},
        {"key": "team", "value": "pulse"},
        {"key": "team", "value": "storage"},
        {"key": "tier", "value": "critical"},
    ]
    # reserved keywords = the filterable column-level DSL keys, sorted
    # alphabetically. Static (independent of the dashboards), so this is the
    # full expected set.
    assert body["data"]["reservedKeywords"] == [
        "created_at",
        "created_by",
        "description",
        "locked",
        "name",
        "updated_at",
    ]

    # ── stage 4: filter DSL ──────────────────────────────────────────────────
    cases = [
        (
            "team = 'pulse'",
            {"Alpha Overview", "Beta Overview", "Zeta Overview"},
        ),
        (
            "env = 'prod'",
            {"Alpha Overview", "Gamma Storage"},
        ),
        (
            "name CONTAINS 'Overview'",
            {"Alpha Overview", "Beta Overview", "Zeta Overview"},
        ),
        (
            "env IN ['dev', 'test']",
            {"Beta Overview", "Delta Storage"},
        ),
        (
            "name LIKE 'Delta%'",
            {"Delta Storage"},
        ),
        (
            "team LIKE 'stor%'",
            {"Gamma Storage", "Delta Storage"},
        ),
        (
            "name ILIKE '%storage'",
            {"Gamma Storage", "Delta Storage"},
        ),
        (
            "name NOT CONTAINS 'Overview'",
            {"Gamma Storage", "Delta Storage", "Epsilon Metrics"},
        ),
        (
            "name NOT LIKE '%Storage'",
            {
                "Alpha Overview",
                "Beta Overview",
                "Epsilon Metrics",
                "Zeta Overview",
            },
        ),
        (
            "name NOT ILIKE 'alpha%'",
            {
                "Beta Overview",
                "Gamma Storage",
                "Delta Storage",
                "Epsilon Metrics",
                "Zeta Overview",
            },
        ),
        (
            "team = 'pulse' AND env = 'prod'",
            {"Alpha Overview"},
        ),
        (
            "team = 'storage' OR env = 'staging'",
            {
                "Gamma Storage",
                "Delta Storage",
                "Epsilon Metrics",
                "Zeta Overview",
            },
        ),
        (
            "tier EXISTS",
            {"Delta Storage", "Epsilon Metrics"},
        ),
        (
            "tier NOT EXISTS",
            {
                "Alpha Overview",
                "Beta Overview",
                "Gamma Storage",
                "Zeta Overview",
            },
        ),
        (
            "NOT team = 'pulse'",
            {"Gamma Storage", "Delta Storage", "Epsilon Metrics"},
        ),
        (
            "(team = 'pulse' OR team = 'storage') AND env = 'prod'",
            {"Alpha Overview", "Gamma Storage"},
        ),
        (
            "NOT (team = 'storage' OR env = 'staging')",
            {"Alpha Overview", "Beta Overview"},
        ),
        (
            "team IN ['pulse', 'metrics'] AND tier EXISTS",
            {"Epsilon Metrics"},
        ),
        (
            "name CONTAINS 'Storage' AND env = 'dev'",
            {"Delta Storage"},
        ),
    ]
    for query, expected in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
            params={"query": query, "limit": 200},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]} == expected, query

    # ── stage 5: name sort honours order ─────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"sort": "name", "order": "asc", "limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert [d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]] == [
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Gamma Storage",
        "Zeta Overview",
    ]
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"sort": "name", "order": "desc", "limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert [d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]] == [
        "Zeta Overview",
        "Gamma Storage",
        "Epsilon Metrics",
        "Delta Storage",
        "Beta Overview",
        "Alpha Overview",
    ]

    # ── stage 6: pinning floats a dashboard to the top of any ordering ───────
    assert (
        requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids['lc-gamma']}/pins"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"sort": "name", "order": "asc", "limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    dashboards = response.json()["data"]["dashboards"]
    assert dashboards[0]["name"] == "lc-gamma"
    assert dashboards[0]["pinned"] is True
    assert all(d["pinned"] is False for d in dashboards[1:])

    # the pure list is user-independent: the same pin neither reorders it (gamma
    # stays in natural name order, not floated to the top) nor adds a pinned field.
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"sort": "name", "order": "asc", "limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert [d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]] == [
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Gamma Storage",
        "Zeta Overview",
    ]
    assert all("pinned" not in d for d in response.json()["data"]["dashboards"])

    # ── stage 7: unpinning restores the natural ordering ─────────────────────
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids['lc-gamma']}/pins"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"sort": "name", "order": "asc", "limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert [d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]] == [
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Gamma Storage",
        "Zeta Overview",
    ]

    # ── stage 8: update mutates the spec but keeps the immutable name ────────
    update_body = {
        "schemaVersion": "v6",
        "name": "lc-alpha",
        "spec": {"display": {"name": "Alpha Overview"}},
        "tags": [
            {"key": "team", "value": "pulse"},
            {"key": "env", "value": "prod"},
        ],
    }
    update_body["spec"]["display"]["description"] = "now with a description"
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-alpha']}"),
        json=update_body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-alpha']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.json()["data"]["spec"]["display"]["description"] == "now with a description"

    # ── stage 9: a locked dashboard rejects updates until unlocked ───────────
    assert (
        requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-beta']}/lock"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    beta_body = {
        "schemaVersion": "v6",
        "name": "lc-beta",
        "spec": {"display": {"name": "Beta Overview"}},
        "tags": [{"key": "team", "value": "pulse"}, {"key": "env", "value": "dev"}],
    }
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-beta']}"),
        json=beta_body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-beta']}/lock"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    assert (
        requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-beta']}"),
            json=beta_body,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.OK
    )

    # ── stage 10: delete removes the dashboard from get and list ─────────────
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-gamma']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    assert (
        requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-gamma']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NOT_FOUND
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        params={"limit": 200},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.json()["data"]["total"] == 5
    assert {d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]} == {
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Zeta Overview",
    }

    # ── stage 11: clone suffixes the display name and mints a new, retrievable one ─
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-alpha']}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    clone = response.json()["data"]
    assert clone["id"] != ids["lc-alpha"]
    assert clone["name"] != "lc-alpha"  # internal name is regenerated
    assert clone["spec"]["display"]["name"] == "Alpha Overview - Copy"  # Copy suffix appended
    assert clone["source"] == "user"
    assert clone["locked"] is False

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{clone['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["id"] == clone["id"]


def test_dashboard_v2_pin_limit(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    max_pinned = 10

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Wipe the dashboard space (see lifecycle) so the per-user pin cap this test
    # asserts against starts empty — deleting dashboards clears their pins.
    _wipe_all_dashboards(signoz, token)

    ids: list[str] = []
    for i in range(max_pinned + 1):
        response = requests.post(
            signoz.self.host_configs["8080"].get(BASE_URL),
            json={
                "schemaVersion": "v6",
                "name": f"pl-{i}",
                "spec": {"display": {"name": f"Pin Limit {i}"}},
                "tags": [],
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text
        ids.append(response.json()["data"]["id"])

    # pinning up to the limit succeeds
    for dashboard_id in ids[:max_pinned]:
        assert (
            requests.put(
                signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{dashboard_id}/pins"),
                headers={"Authorization": f"Bearer {token}"},
                timeout=5,
            ).status_code
            == HTTPStatus.NO_CONTENT
        )

    # re-pinning an already-pinned dashboard is an idempotent no-op, even at the limit
    assert (
        requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[0]}/pins"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )

    # the 11th distinct pin is rejected with the typed limit error
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[max_pinned]}/pins"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CONFLICT, response.text
    assert response.json()["error"]["code"] == "pinned_dashboard_limit_hit"

    # unpinning frees a slot, so the previously-rejected dashboard can now be pinned
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[0]}/pins"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    assert (
        requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[max_pinned]}/pins"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )


# TODO: add an integration test that clones an integration-source dashboard once
# integration dashboards adopt the v2 (perses) flow. Today they're created via the
# v1 path, and the v2 clone endpoint only operates on v6 dashboards — so the
# integration-source branch of clone is unreachable through the API.


# ─── LIKE escaping ───────────────────────────────────────────────────────────
# Backslash is the LIKE escape character, declared explicitly via ESCAPE '\' on
# every emitted LIKE/ILIKE. Postgres defaults to backslash; sqlite has no default
# escape, so without the clause the two dialects disagree on any pattern carrying
# a backslash. Two ways a backslash shows up: CONTAINS injects its own to escape
# the user's % and _ (so `50%` matches literally), and LIKE/ILIKE pass through a
# user-supplied `\%` / `\_`. These cases assert literal-match semantics so a
# dialect that drops the escape fails here. Backslash-bearing queries use raw
# python strings so the backslash reaches the DSL verbatim.


def test_dashboard_v2_like_escaping(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Wipe the dashboard space (see lifecycle) so the filter assertions run
    # against only the dashboards this test creates.
    _wipe_all_dashboards(signoz, token)

    dashboard_requests = [
        ("esc-pct", "Cost 50% Report"),
        ("esc-pct-plain", "Cost 5000 Report"),
        ("esc-underscore", "user_id panel"),
        ("esc-underscore-wild", "userXid panel"),
    ]
    for name, display in dashboard_requests:
        response = requests.post(
            signoz.self.host_configs["8080"].get(BASE_URL),
            json={
                "schemaVersion": "v6",
                "name": name,
                "spec": {"display": {"name": display}},
                "tags": [],
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

    cases = [
        (
            "name CONTAINS '50%'",
            {"Cost 50% Report"},
        ),
        (
            "name CONTAINS 'user_id'",
            {"user_id panel"},
        ),
        (
            "name NOT CONTAINS '50%'",
            {"Cost 5000 Report", "user_id panel", "userXid panel"},
        ),
        (
            r"name LIKE 'Cost 50\% Report'",
            {"Cost 50% Report"},
        ),
        (
            r"name ILIKE 'cost 50\% report'",
            {"Cost 50% Report"},
        ),
        (
            r"name LIKE 'user\_id panel'",
            {"user_id panel"},
        ),
        (
            r"name NOT LIKE 'user\_id panel'",
            {"Cost 50% Report", "Cost 5000 Report", "userXid panel"},
        ),
    ]
    for query, expected in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
            params={"query": query, "limit": 200},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {d["spec"]["display"]["name"] for d in response.json()["data"]["dashboards"]} == expected, query


# ─── get dashboards by metric name (v3) ──────────────────────────────────────


def test_dashboard_v2_get_by_metric_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """The v3 endpoint shortlists dashboards via a coarse data prefilter, then
    confirms matches by parsing the typed v2 panels. It must find the metric in
    builder, promql, and clickhouse queries, and must NOT report a dashboard where
    the metric appears only in panel names (the prefilter matches but the parse
    rejects it)."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    _wipe_all_dashboards(signoz, token)

    target_metric = "system.network.dropped"
    decoy_metric = "system.network.io"

    # The endpoint gates on metric existence (checkMetricExists reads
    # signoz_metrics.distributed_metadata), so seed the target metric there. A
    # label is required for a metadata row to be written.
    insert_metrics(
        [
            Metrics(
                metric_name=target_metric,
                labels={"host.name": "test-host"},
                temporality="Cumulative",
                value=1.0,
            )
        ]
    )

    # D1: a single builder query referencing the target metric.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "by-metric-builder",
            "spec": {
                "display": {"name": "by-metric-builder"},
                "panels": {
                    "p-builder": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": "D1 builder target"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/BuilderQuery",
                                            "spec": {
                                                "name": "A",
                                                "signal": "metrics",
                                                "aggregations": [
                                                    {
                                                        "metricName": target_metric,
                                                        "timeAggregation": "rate",
                                                        "spaceAggregation": "sum",
                                                    }
                                                ],
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    }
                },
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    d1_id = response.json()["data"]["id"]

    # D2: one clickhouse panel and one promql panel, both referencing the target
    # metric (one query per panel is enforced by validation). Two matching panels
    # in one dashboard also guards against a dashboard/widget being returned twice.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "by-metric-ch-promql",
            "spec": {
                "display": {"name": "by-metric-ch-promql"},
                "panels": {
                    "p-ch": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": "D2 clickhouse target"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/ClickHouseSQL",
                                            "spec": {
                                                "name": "A",
                                                "query": f"select * from signoz_metrics.distributed_samples_v4 where metric_name IN ['{target_metric}']",
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    },
                    "p-promql": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": "D2 promql target"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/PromQLQuery",
                                            "spec": {
                                                "name": "A",
                                                "query": f'sum(rate({{"{target_metric}"}}[5m]))',
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    },
                },
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    d2_id = response.json()["data"]["id"]

    # D3: a promql-only dashboard referencing the target metric, so a promql
    # extraction regression is caught independently of the clickhouse path above.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "by-metric-promql",
            "spec": {
                "display": {"name": "by-metric-promql"},
                "panels": {
                    "p-promql": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": "D3 promql target"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/PromQLQuery",
                                            "spec": {
                                                "name": "A",
                                                "query": f'sum(rate({{"{target_metric}"}}[5m]))',
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    }
                },
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    d3_id = response.json()["data"]["id"]

    # D4: all three query types, but the target name appears only in the panel
    # names; the queries reference a decoy metric. The data prefilter matches
    # (panel names contain the target), but parsing the queries must not associate
    # the target metric, so this dashboard must be excluded from the result.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": "by-metric-false-positive",
            "spec": {
                "display": {"name": "by-metric-false-positive"},
                "panels": {
                    "p-builder": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": f"{target_metric} builder"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/BuilderQuery",
                                            "spec": {
                                                "name": "A",
                                                "signal": "metrics",
                                                "aggregations": [
                                                    {
                                                        "metricName": decoy_metric,
                                                        "timeAggregation": "rate",
                                                        "spaceAggregation": "sum",
                                                    }
                                                ],
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    },
                    "p-ch": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": f"{target_metric} clickhouse"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/ClickHouseSQL",
                                            "spec": {
                                                "name": "A",
                                                "query": f"select * from signoz_metrics.distributed_samples_v4 where metric_name IN ['{decoy_metric}']",
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    },
                    "p-promql": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": f"{target_metric} promql"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/PromQLQuery",
                                            "spec": {
                                                "name": "A",
                                                "query": f'sum(rate({{"{decoy_metric}"}}[5m]))',
                                            },
                                        }
                                    },
                                }
                            ],
                        },
                    },
                },
            },
            "tags": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    d4_id = response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/metrics/dashboards"),
        params={"metricName": target_metric},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    dashboards = response.json()["data"]["dashboards"]

    # No dashboard/panel should be returned more than once.
    pairs = [(d["dashboardId"], d["panelId"]) for d in dashboards]
    assert len(pairs) == len(set(pairs))

    # D1 (1 panel) + D2 (2 panels) + D3 (1 promql panel) match; D4 (target only in
    # panel names) does not.
    assert {d["dashboardId"] for d in dashboards} == {d1_id, d2_id, d3_id}
    assert d4_id not in {d["dashboardId"] for d in dashboards}

    by_dashboard: dict[str, list[str]] = {}
    for d in dashboards:
        by_dashboard.setdefault(d["dashboardId"], []).append(d["panelName"])
    assert sorted(by_dashboard[d1_id]) == ["D1 builder target"]
    assert sorted(by_dashboard[d2_id]) == ["D2 clickhouse target", "D2 promql target"]
    assert sorted(by_dashboard[d3_id]) == ["D3 promql target"]


# ─── aggregation expression validation ───────────────────────────────────────


def test_dashboard_v2_rejects_comma_separated_aggregation(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """The querier never splits aggregation expressions, so each aggregation entry must
    be a single function call. A comma-separated expression ("count(), sum(...)") is
    rejected at create time; the pre-split form of the same panel is accepted."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def make_dashboard(aggregations: list[dict]) -> dict:
        return {
            "schemaVersion": "v6",
            "name": f"agg-{uuid.uuid4().hex[:8]}",
            "tags": [],
            "spec": {
                "display": {"name": "Aggregation"},
                "panels": {
                    "p-agg": {
                        "kind": "Panel",
                        "spec": {
                            "display": {"name": "agg"},
                            "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                            "queries": [
                                {
                                    "kind": "time_series",
                                    "spec": {
                                        "plugin": {
                                            "kind": "signoz/BuilderQuery",
                                            "spec": {"name": "A", "signal": "logs", "aggregations": aggregations},
                                        }
                                    },
                                }
                            ],
                        },
                    }
                },
            },
        }

    # a single comma-separated expression is rejected
    rejected = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=make_dashboard([{"expression": "count(), sum(latency_ms)"}]),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert rejected.status_code == HTTPStatus.BAD_REQUEST, rejected.text
    assert "single function call" in rejected.text, rejected.text

    # the pre-split form of the same panel is accepted
    accepted = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=make_dashboard([{"expression": "count()"}, {"expression": "sum(latency_ms)"}]),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert accepted.status_code == HTTPStatus.CREATED, accepted.text

    # a single call whose string literal contains parentheses is accepted (the check
    # parses rather than counting "word(", so it does not mistake ')...(' for a second call)
    literal_parens = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=make_dashboard([{"expression": "countIf(body = 'a)b(c)')"}]),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert literal_parens.status_code == HTTPStatus.CREATED, literal_parens.text

    for dashboard_id in (accepted.json()["data"]["id"], literal_parens.json()["data"]["id"]):
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{dashboard_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
