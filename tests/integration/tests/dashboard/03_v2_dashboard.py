import uuid
from collections.abc import Callable, Iterator
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

# The v2 dashboard API. Request shape (current):
#   {"schemaVersion": "v6", "name": "<dns-1123-label>",
#    "spec": {"display": {"name": "<human name>"}},
#    "tags": [{"key": "...", "value": "..."}]}
# `name` is a DNS-1123 label identifier and is immutable after create;
# `spec.display.name` is the human-facing title used for name-sort/name-filter.

_BASE = "/api/v2/dashboards"
_TIMEOUT = 5

# Every dashboard created by this file's tests carries this marker so the
# cleanup_suite fixture can delete them on teardown without touching dashboards
# owned by other test files sharing the session DB.
_SUITE_VALUE = "dashboardv2"
_SUITE_TAG = {"key": "suite", "value": _SUITE_VALUE}
_SUITE_FILTER = f"suite = '{_SUITE_VALUE}'"


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _url(signoz: SigNoz, path: str = "") -> str:
    return signoz.self.host_configs["8080"].get(f"{_BASE}{path}")


def _create(signoz: SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(_url(signoz), json=body, headers=_headers(token), timeout=_TIMEOUT)


def _get(signoz: SigNoz, token: str, dashboard_id: str) -> requests.Response:
    return requests.get(_url(signoz, f"/{dashboard_id}"), headers=_headers(token), timeout=_TIMEOUT)


def _list(signoz: SigNoz, token: str, **params: object) -> requests.Response:
    return requests.get(
        _url(signoz),
        params={k: v for k, v in params.items() if v is not None},
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _update(signoz: SigNoz, token: str, dashboard_id: str, body: dict) -> requests.Response:
    return requests.put(
        _url(signoz, f"/{dashboard_id}"),
        json=body,
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _delete(signoz: SigNoz, token: str, dashboard_id: str) -> requests.Response:
    return requests.delete(_url(signoz, f"/{dashboard_id}"), headers=_headers(token), timeout=_TIMEOUT)


def _lock(signoz: SigNoz, token: str, dashboard_id: str, lock: bool) -> requests.Response:
    method = requests.put if lock else requests.delete
    return method(
        _url(signoz, f"/{dashboard_id}/lock"),
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _pin(signoz: SigNoz, token: str, dashboard_id: str, pin: bool) -> requests.Response:
    method = requests.put if pin else requests.delete
    return method(
        _url(signoz, f"/{dashboard_id}/pins/me"),
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _minimal_body(name: str, display: str, tags: list[dict] | None = None) -> dict:
    return {
        "schemaVersion": "v6",
        "name": name,
        "spec": {"display": {"name": display}},
        "tags": tags or [],
    }


# ─── failure cases (create no dashboards) ────────────────────────────────────


def test_create_rejects_wrong_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _create(signoz, token, {})

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

    response = _create(signoz, token, {"schemaVersion": "v6"})

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

    response = _create(signoz, token, _minimal_body(name="Not A Label", display="Not A Label"))

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"


def test_create_rejects_unknown_field(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _minimal_body("rejects-unknown", "Rejects Unknown")
    body["unknownfield"] = "boom"
    response = _create(signoz, token, body)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"
    assert "unknown field" in response.json()["error"]["message"]


def test_create_rejects_reserved_tag_key(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _minimal_body("rejects-reserved", "Rejects Reserved", [{"key": "source", "value": "x"}])
    response = _create(signoz, token, body)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_invalid_input"


def test_create_rejects_too_many_tags(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    tags = [{"key": f"k{i}", "value": "v"} for i in range(11)]
    response = _create(signoz, token, _minimal_body("too-many-tags", "Too Many", tags))

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

    response = _list(signoz, token, **params)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_list_invalid"


def test_get_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _get(signoz, token, "not-a-uuid")

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_get_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _get(signoz, token, str(uuid.uuid4()))

    assert response.status_code == HTTPStatus.NOT_FOUND


def test_delete_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _delete(signoz, token, str(uuid.uuid4()))

    assert response.status_code == HTTPStatus.NOT_FOUND


def test_pin_missing_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _pin(signoz, token, str(uuid.uuid4()), pin=True)

    assert response.status_code == HTTPStatus.NOT_FOUND


# ─── lifecycle ───────────────────────────────────────────────────────────────
# A single end-to-end flow through create → get → list/filter/sort → pin →
# update → lock → delete. Every fixture dashboard carries the shared suite marker
# tag so list queries can be scoped server-side, isolating this test from any
# other dashboards sharing the session DB.


def _display_names(body: dict) -> list[str]:
    return [d["spec"]["display"]["name"] for d in body["data"]["dashboards"]]


def _delete_suite(signoz: SigNoz, token: str, suite_filter: str) -> None:
    response = _list(signoz, token, query=suite_filter, limit=200)
    if response.status_code != HTTPStatus.OK:
        return
    for dashboard in response.json()["data"]["dashboards"]:
        _delete(signoz, token, dashboard["id"])


@pytest.fixture(name="cleanup_suite")
def _cleanup_suite(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
) -> Iterator[None]:
    """Deletes every dashboard carrying this file's suite marker (_SUITE_FILTER) on teardown."""
    yield
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    _delete_suite(signoz, token, _SUITE_FILTER)


def test_dashboard_v2_lifecycle(  # pylint: disable=too-many-locals,too-many-statements
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_suite: None,  # pylint: disable=unused-argument # teardown-only fixture
):
    def _scoped(query: str) -> str:
        return f"({query}) AND {_SUITE_FILTER}"

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
        response = _create(signoz, token, _minimal_body(name, display, [_SUITE_TAG, *tags]))
        assert response.status_code == HTTPStatus.CREATED, response.text
        ids[name] = response.json()["data"]["id"]

    # TODO: re-enable once the dashboard name unique index lands — creating a
    # second dashboard with an existing name should conflict (409). Until the
    # index exists, duplicate names are silently allowed.
    # response = _create(signoz, token, _minimal_body("lc-alpha", "Alpha Dupe"))
    # assert response.status_code == HTTPStatus.CONFLICT, response.text

    # ── stage 2: get one and verify the round-tripped shape ──────────────────
    response = _get(signoz, token, ids["lc-alpha"])
    assert response.status_code == HTTPStatus.OK, response.text
    alpha = response.json()["data"]
    assert alpha["id"] == ids["lc-alpha"]
    assert alpha["name"] == "lc-alpha"
    assert alpha["spec"]["display"]["name"] == "Alpha Overview"
    assert alpha["schemaVersion"] == "v6"
    assert alpha["source"] == "user"
    assert alpha["locked"] is False
    assert {"key": "team", "value": "pulse"} in alpha["tags"]

    # ── stage 3: list everything in the suite ────────────────────────────────
    response = _list(signoz, token, query=_SUITE_FILTER, limit=200)
    assert response.status_code == HTTPStatus.OK, response.text
    body = response.json()
    assert body["data"]["total"] == 6
    assert set(_display_names(body)) == {
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
        response = _list(signoz, token, query=_scoped(query), limit=200)
        assert response.status_code == HTTPStatus.OK, response.text
        assert set(_display_names(response.json())) == expected, query

    # ── stage 5: name sort honours order ─────────────────────────────────────
    response = _list(signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200)
    assert _display_names(response.json()) == [
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Gamma Storage",
        "Zeta Overview",
    ]
    response = _list(signoz, token, query=_SUITE_FILTER, sort="name", order="desc", limit=200)
    assert _display_names(response.json()) == [
        "Zeta Overview",
        "Gamma Storage",
        "Epsilon Metrics",
        "Delta Storage",
        "Beta Overview",
        "Alpha Overview",
    ]

    # ── stage 6: pinning floats a dashboard to the top of any ordering ───────
    assert _pin(signoz, token, ids["lc-gamma"], pin=True).status_code == HTTPStatus.NO_CONTENT
    response = _list(signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200)
    dashboards = response.json()["data"]["dashboards"]
    assert dashboards[0]["name"] == "lc-gamma"
    assert dashboards[0]["pinned"] is True
    assert all(d["pinned"] is False for d in dashboards[1:])

    # ── stage 7: unpinning restores the natural ordering ─────────────────────
    assert _pin(signoz, token, ids["lc-gamma"], pin=False).status_code == HTTPStatus.NO_CONTENT
    response = _list(signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200)
    assert _display_names(response.json()) == [
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Gamma Storage",
        "Zeta Overview",
    ]

    # ── stage 8: update mutates the spec but keeps the immutable name ────────
    update_body = _minimal_body(
        "lc-alpha",
        "Alpha Overview",
        [
            _SUITE_TAG,
            {"key": "team", "value": "pulse"},
            {"key": "env", "value": "prod"},
        ],
    )
    update_body["spec"]["display"]["description"] = "now with a description"
    response = _update(signoz, token, ids["lc-alpha"], update_body)
    assert response.status_code == HTTPStatus.OK, response.text
    response = _get(signoz, token, ids["lc-alpha"])
    assert response.json()["data"]["spec"]["display"]["description"] == "now with a description"

    # ── stage 9: a locked dashboard rejects updates until unlocked ───────────
    assert _lock(signoz, token, ids["lc-beta"], lock=True).status_code == HTTPStatus.NO_CONTENT
    beta_body = _minimal_body(
        "lc-beta",
        "Beta Overview",
        [_SUITE_TAG, {"key": "team", "value": "pulse"}, {"key": "env", "value": "dev"}],
    )
    response = _update(signoz, token, ids["lc-beta"], beta_body)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert _lock(signoz, token, ids["lc-beta"], lock=False).status_code == HTTPStatus.NO_CONTENT
    assert _update(signoz, token, ids["lc-beta"], beta_body).status_code == HTTPStatus.OK

    # ── stage 10: delete removes the dashboard from get and list ─────────────
    assert _delete(signoz, token, ids["lc-gamma"]).status_code == HTTPStatus.NO_CONTENT
    assert _get(signoz, token, ids["lc-gamma"]).status_code == HTTPStatus.NOT_FOUND
    response = _list(signoz, token, query=_SUITE_FILTER, limit=200)
    assert response.json()["data"]["total"] == 5
    assert set(_display_names(response.json())) == {
        "Alpha Overview",
        "Beta Overview",
        "Delta Storage",
        "Epsilon Metrics",
        "Zeta Overview",
    }


def test_dashboard_v2_pin_limit(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_suite: None,  # pylint: disable=unused-argument # teardown-only fixture
):
    max_pinned = 10

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    ids: list[str] = []
    for i in range(max_pinned + 1):
        response = _create(signoz, token, _minimal_body(f"pl-{i}", f"Pin Limit {i}", [_SUITE_TAG]))
        assert response.status_code == HTTPStatus.CREATED, response.text
        ids.append(response.json()["data"]["id"])

    # pinning up to the limit succeeds
    for dashboard_id in ids[:max_pinned]:
        assert _pin(signoz, token, dashboard_id, pin=True).status_code == HTTPStatus.NO_CONTENT

    # re-pinning an already-pinned dashboard is an idempotent no-op, even at the limit
    assert _pin(signoz, token, ids[0], pin=True).status_code == HTTPStatus.NO_CONTENT

    # the 11th distinct pin is rejected with the typed limit error
    response = _pin(signoz, token, ids[max_pinned], pin=True)
    assert response.status_code == HTTPStatus.CONFLICT, response.text
    assert response.json()["error"]["code"] == "pinned_dashboard_limit_hit"

    # unpinning frees a slot, so the previously-rejected dashboard can now be pinned
    assert _pin(signoz, token, ids[0], pin=False).status_code == HTTPStatus.NO_CONTENT
    assert _pin(signoz, token, ids[max_pinned], pin=True).status_code == HTTPStatus.NO_CONTENT


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
    cleanup_suite: None,  # pylint: disable=unused-argument # teardown-only fixture
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    dashboard_requests = [
        ("esc-pct", "Cost 50% Report"),
        ("esc-pct-plain", "Cost 5000 Report"),
        ("esc-underscore", "user_id panel"),
        ("esc-underscore-wild", "userXid panel"),
    ]
    for name, display in dashboard_requests:
        response = _create(signoz, token, _minimal_body(name, display, [_SUITE_TAG]))
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
        response = _list(
            signoz,
            token,
            query=f"({query}) AND {_SUITE_FILTER}",
            limit=200,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert set(_display_names(response.json())) == expected, query
