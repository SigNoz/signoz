import uuid
from collections.abc import Callable
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


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _url(signoz: SigNoz, path: str = "") -> str:
    return signoz.self.host_configs["8080"].get(f"{_BASE}{path}")


def _create(signoz: SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(
        _url(signoz), json=body, headers=_headers(token), timeout=_TIMEOUT
    )


def _get(signoz: SigNoz, token: str, dashboard_id: str) -> requests.Response:
    return requests.get(
        _url(signoz, f"/{dashboard_id}"), headers=_headers(token), timeout=_TIMEOUT
    )


def _list(signoz: SigNoz, token: str, **params: object) -> requests.Response:
    return requests.get(
        _url(signoz),
        params={k: v for k, v in params.items() if v is not None},
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _update(
    signoz: SigNoz, token: str, dashboard_id: str, body: dict
) -> requests.Response:
    return requests.put(
        _url(signoz, f"/{dashboard_id}"),
        json=body,
        headers=_headers(token),
        timeout=_TIMEOUT,
    )


def _delete(signoz: SigNoz, token: str, dashboard_id: str) -> requests.Response:
    return requests.delete(
        _url(signoz, f"/{dashboard_id}"), headers=_headers(token), timeout=_TIMEOUT
    )


def _lock(
    signoz: SigNoz, token: str, dashboard_id: str, lock: bool
) -> requests.Response:
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

    response = _create(
        signoz, token, _minimal_body(name="Not A Label", display="Not A Label")
    )

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

    body = _minimal_body(
        "rejects-reserved", "Rejects Reserved", [{"key": "source", "value": "x"}]
    )
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
# update → lock → delete. Every fixture dashboard carries a unique suite marker
# tag so list queries can be scoped server-side, isolating this test from any
# other dashboards sharing the session DB.

_SUITE_TAG = {"key": "suite", "value": "lifecyclev2"}
_SUITE_FILTER = "suite = 'lifecyclev2'"


def _scoped(query: str) -> str:
    return f"({query}) AND {_SUITE_FILTER}"


def _display_names(body: dict) -> list[str]:
    return [d["spec"]["display"]["name"] for d in body["data"]["dashboards"]]


def test_dashboard_v2_lifecycle(  # pylint: disable=too-many-locals,too-many-statements
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    fixtures = [
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
    ]

    # ── stage 1: create ──────────────────────────────────────────────────────
    ids: dict[str, str] = {}
    for name, display, tags in fixtures:
        response = _create(
            signoz, token, _minimal_body(name, display, [_SUITE_TAG, *tags])
        )
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
    assert body["data"]["total"] == 3
    assert set(_display_names(body)) == {
        "Alpha Overview",
        "Beta Overview",
        "Gamma Storage",
    }

    # ── stage 4: filter DSL (tag-key filters + display-name contains) ────────
    cases = [
        ("team = 'pulse'", {"Alpha Overview", "Beta Overview"}),
        ("env = 'prod'", {"Alpha Overview", "Gamma Storage"}),
        ("name CONTAINS 'Overview'", {"Alpha Overview", "Beta Overview"}),
        ("env IN ['dev', 'test']", {"Beta Overview"}),
    ]
    for query, expected in cases:
        response = _list(signoz, token, query=_scoped(query), limit=200)
        assert response.status_code == HTTPStatus.OK, response.text
        assert set(_display_names(response.json())) == expected, query

    # ── stage 5: name sort honours order ─────────────────────────────────────
    response = _list(
        signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200
    )
    assert _display_names(response.json()) == [
        "Alpha Overview",
        "Beta Overview",
        "Gamma Storage",
    ]
    response = _list(
        signoz, token, query=_SUITE_FILTER, sort="name", order="desc", limit=200
    )
    assert _display_names(response.json()) == [
        "Gamma Storage",
        "Beta Overview",
        "Alpha Overview",
    ]

    # ── stage 6: pinning floats a dashboard to the top of any ordering ───────
    assert (
        _pin(signoz, token, ids["lc-gamma"], pin=True).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = _list(
        signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200
    )
    dashboards = response.json()["data"]["dashboards"]
    assert dashboards[0]["name"] == "lc-gamma"
    assert dashboards[0]["pinned"] is True
    assert all(d["pinned"] is False for d in dashboards[1:])

    # ── stage 7: unpinning restores the natural ordering ─────────────────────
    assert (
        _pin(signoz, token, ids["lc-gamma"], pin=False).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = _list(
        signoz, token, query=_SUITE_FILTER, sort="name", order="asc", limit=200
    )
    assert _display_names(response.json()) == [
        "Alpha Overview",
        "Beta Overview",
        "Gamma Storage",
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
    assert (
        response.json()["data"]["spec"]["display"]["description"]
        == "now with a description"
    )

    # ── stage 9: a locked dashboard rejects updates until unlocked ───────────
    assert (
        _lock(signoz, token, ids["lc-beta"], lock=True).status_code
        == HTTPStatus.NO_CONTENT
    )
    beta_body = _minimal_body(
        "lc-beta",
        "Beta Overview",
        [_SUITE_TAG, {"key": "team", "value": "pulse"}, {"key": "env", "value": "dev"}],
    )
    response = _update(signoz, token, ids["lc-beta"], beta_body)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert (
        _lock(signoz, token, ids["lc-beta"], lock=False).status_code
        == HTTPStatus.NO_CONTENT
    )
    assert (
        _update(signoz, token, ids["lc-beta"], beta_body).status_code == HTTPStatus.OK
    )

    # ── stage 10: delete removes the dashboard from get and list ─────────────
    assert _delete(signoz, token, ids["lc-gamma"]).status_code == HTTPStatus.NO_CONTENT
    assert _get(signoz, token, ids["lc-gamma"]).status_code == HTTPStatus.NOT_FOUND
    response = _list(signoz, token, query=_SUITE_FILTER, limit=200)
    assert response.json()["data"]["total"] == 2
    assert set(_display_names(response.json())) == {"Alpha Overview", "Beta Overview"}
