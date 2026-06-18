import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
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

    # ── stage 11: clone keeps the display name but mints a new, retrievable one ─
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{ids['lc-alpha']}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    clone = response.json()["data"]
    assert clone["id"] != ids["lc-alpha"]
    assert clone["name"] != "lc-alpha"  # internal name is regenerated
    assert clone["spec"]["display"]["name"] == "Alpha Overview"  # display name preserved
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
