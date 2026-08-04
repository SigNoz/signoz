import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/saved_views"


def _query(*, disabled: bool = False, legend: str = "") -> dict:
    return {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "logs",
            "aggregations": [{"expression": "count()"}],
            "disabled": disabled,
            "legend": legend,
        },
    }


def _body(
    *,
    name: str = "my-view",
    source_page: str = "logs",
    panel_type: str = "table",
    max_lines: int = 0,
    font_size: str = "",
    fmt: str = "",
    color: str = "",
    selected_fields: list | None = None,
    disabled: bool = False,
    legend: str = "",
) -> dict:
    return {
        "name": name,
        "sourcePage": source_page,
        "data": {
            "schemaVersion": "v2",
            "spec": {
                "panelType": panel_type,
                "queries": [_query(disabled=disabled, legend=legend)],
                "selectedFields": [] if selected_fields is None else selected_fields,
                "display": {"maxLines": max_lines, "fontSize": font_size, "format": fmt, "color": color},
            },
        },
    }


# ─── failure cases (create no saved views) ───────────────────────────────────


def test_create_rejects_wrong_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _body()
    body["data"]["schemaVersion"] = "v9"
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"
    assert response.json()["error"]["message"] == 'schemaVersion must be "v2", got "v9"'


def test_create_rejects_invalid_panel_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _body()
    body["data"]["spec"]["panelType"] = "bogus"
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"


def test_create_rejects_empty_queries(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _body()
    body["data"]["spec"]["queries"] = []
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    # CompositeQuery.Validate() (querybuildertypesv5) raises this with the generic
    # invalid_input code, not saved_view_invalid_input -- unlike schemaVersion/
    # panelType/sourcePage, which are validated directly by savedviewtypes.
    assert response.json()["error"]["code"] == "invalid_input"
    assert "at least one query is required" in response.json()["error"]["message"]


def test_create_rejects_invalid_source_page(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    body = _body()
    body["sourcePage"] = "bogus"
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"


def test_create_rejects_unknown_field(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Unlike dashboard v2's PostableDashboardV2 (which has a custom UnmarshalJSON
    # that rewraps this as its own dashboard_invalid_input code), PostableSavedView
    # relies solely on binding.WithDisallowUnknownFields, so this surfaces as the
    # generic invalid_input code rather than saved_view_invalid_input.
    body = _body()
    body["unknownfield"] = "boom"
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "invalid_input"
    assert "unknown field" in response.json()["error"]["message"]


# ─── not-found cases ──────────────────────────────────────────────────────────


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


def test_get_missing_view_returns_not_found(
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
    assert response.json()["error"]["code"] == "saved_view_not_found"


def test_update_missing_view_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        json=_body(),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "saved_view_not_found"


def test_delete_missing_view_returns_not_found(
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
    assert response.json()["error"]["code"] == "saved_view_not_found"


# ─── lifecycle ───────────────────────────────────────────────────────────────


def test_saved_view_lifecycle(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    # ── create ────────────────────────────────────────────────────────────────
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=_body(name="lc-logs-overview", source_page="logs"),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    view_id = response.json()["data"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=_body(name="lc-traces-overview", source_page="traces"),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    try:
        # ── get echoes back the created shape ────────────────────────────────
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        got = response.json()["data"]
        assert got["id"] == view_id
        assert got["name"] == "lc-logs-overview"
        assert got["sourcePage"] == "logs"
        assert got["data"]["spec"]["panelType"] == "table"

        # ── list filters by sourcePage and name ──────────────────────────────
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"sourcePage": "logs"},
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {v["name"] for v in response.json()["data"]} == {"lc-logs-overview"}

        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"sourcePage": "logs", "name": "overview"},
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {v["name"] for v in response.json()["data"]} == {"lc-logs-overview"}

        # ── update mutates name, sourcePage and spec ─────────────────────────
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json=_body(name="lc-logs-renamed", source_page="metrics", panel_type="graph"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text

        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        updated = response.json()["data"]
        assert updated["name"] == "lc-logs-renamed"
        assert updated["sourcePage"] == "metrics"
        assert updated["data"]["spec"]["panelType"] == "graph"
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )

    # ── delete removes it from get and list ──────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND


# ─── round-trip serialization: zero/empty values must not get corrupted ──────
# A value that's genuinely zero (maxLines: 0), empty (""), or an explicit empty
# list must survive being written and read back exactly as sent — never dropped,
# defaulted, or turned into null. The riskier case is not create -> GET (a fresh
# row), it's UPDATE -> GET: overwriting a *previously non-zero* value down to its
# zero value must actually take effect on the persisted row, not silently retain
# the old value or lose the field. See test_dashboard_v2_roundtrip_preserves_zero_values
# for the analogous dashboard v2 case.


def test_create_roundtrip_preserves_zero_values(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=_body(
            name="create-zero-values",
            max_lines=0,
            font_size="",
            fmt="",
            color="",
            selected_fields=[],
            disabled=False,
            legend="",
        ),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    view_id = response.json()["data"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["data"]["spec"]
        query = spec["queries"][0]["spec"]

        cases = [
            ("maxLines 0", spec["display"]["maxLines"], 0),
            ("fontSize empty", spec["display"]["fontSize"], ""),
            ("format empty", spec["display"]["format"], ""),
            ("color empty", spec["display"]["color"], ""),
            ("selectedFields explicit empty list", spec["selectedFields"], []),
            ("query disabled false", query["disabled"], False),
            ("query legend empty", query["legend"], ""),
        ]
        for description, actual, expected in cases:
            assert actual == expected, description
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


def test_selected_fields_omitted_on_create_reads_back_as_empty_list_not_null(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    body = _body(name="omitted-selected-fields")
    del body["data"]["spec"]["selectedFields"]
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    view_id = response.json()["data"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["data"]["spec"]["selectedFields"] == []
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


def test_update_does_not_corrupt_zero_values(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """The failure mode this guards against: an update that writes maxLines=0 (or
    any other zero/empty value) either silently keeps the previous non-zero value
    (a partial-update bug) or drops/nulls the field on read-back (a serialization
    bug). Both are round-trip corruption; only an exact zero on GET proves neither
    happened."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    # ── create with deliberately non-zero values everywhere ──────────────────
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=_body(
            name="update-zero-values",
            max_lines=25,
            font_size="large",
            fmt="table",
            color="blue",
            selected_fields=[{"name": "service.name"}],
            disabled=True,
            legend="Custom Legend",
        ),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    view_id = response.json()["data"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["data"]["spec"]
        assert spec["display"]["maxLines"] == 25
        # signal/fieldContext/fieldDataType always serialize on TelemetryFieldKey
        # (no omitempty -- see pkg/types/telemetrytypes/field.go), so an entry sent
        # with only "name" reads back with those three as explicit "".
        assert spec["selectedFields"] == [{"name": "service.name", "signal": "", "fieldContext": "", "fieldDataType": ""}]
        assert spec["queries"][0]["spec"]["disabled"] is True

        # ── update overwrites every one of those fields down to its zero value ──
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json=_body(
                name="update-zero-values",
                max_lines=0,
                font_size="",
                fmt="",
                color="",
                selected_fields=[],
                disabled=False,
                legend="",
            ),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text

        # ── the zero values took effect -- not retained, not dropped, not null ──
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["data"]["spec"]
        query = spec["queries"][0]["spec"]

        cases = [
            ("maxLines reset to 0", spec["display"]["maxLines"], 0),
            ("fontSize reset to empty", spec["display"]["fontSize"], ""),
            ("format reset to empty", spec["display"]["format"], ""),
            ("color reset to empty", spec["display"]["color"], ""),
            ("selectedFields reset to empty list", spec["selectedFields"], []),
            ("query disabled reset to false", query["disabled"], False),
            ("query legend reset to empty", query["legend"], ""),
        ]
        for description, actual, expected in cases:
            assert actual == expected, description
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
