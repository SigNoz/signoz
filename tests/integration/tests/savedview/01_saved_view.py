import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/saved_views"


# ─── failure cases (create no saved views) ───────────────────────────────────


def test_create_rejects_wrong_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v9",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
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

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "bogus",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
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

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    # CompositeQuery.Validate() (querybuildertypesv5) raises this with the generic
    # invalid_input code, not saved_view_invalid_input -- unlike schemaVersion/
    # panelType/source, which are validated directly by savedviewtypes.
    assert response.json()["error"]["code"] == "invalid_input"
    assert "at least one query is required" in response.json()["error"]["message"]


def test_create_rejects_empty_display_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"
    assert "displayName is required" in response.json()["error"]["message"]


def test_create_rejects_invalid_source(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "bogus",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"


def test_create_rejects_invalid_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "Not A Valid Slug",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"


def test_create_rejects_empty_name_without_generate_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Guards against a round-trip bug: an empty name must never silently
    generate one -- generateName has to be explicitly set."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"
    assert "name is required" in response.json()["error"]["message"]


def test_create_rejects_name_when_generate_name_is_true(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # name is the immutable slug. Pass generateName=true (and leave name empty)
    # to have the server generate one from displayName instead.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "explicit-name",
            "generateName": True,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "saved_view_invalid_input"
    assert "name must be empty when generateName is true" in response.json()["error"]["message"]


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
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "my-view",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
            "unknownfield": "boom",
        },
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
        json={
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "saved_view_not_found"


def test_update_rejects_name_field(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Name is immutable and simply has no place in the update payload -- an
    update request that includes it is rejected as an unknown field, not
    silently ignored or checked for a match."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "update-rejects-name-field",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My View",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json={
                "source": "logs",
                "schemaVersion": "v2",
                "spec": {
                    "displayName": "My View",
                    "requestType": "scalar",
                    "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                    "selectedFields": [],
                    "panelType": "table",
                    "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
                },
                "name": "update-rejects-name-field",
            },
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
        assert response.json()["error"]["code"] == "invalid_input"
        assert "unknown field" in response.json()["error"]["message"]
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


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
        json={
            "name": "lc-logs-overview",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "lc-logs-overview",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "lc-traces-overview",
            "generateName": False,
            "source": "traces",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "lc-traces-overview",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

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
        assert got["spec"]["displayName"] == "lc-logs-overview"
        assert got["source"] == "logs"
        assert got["spec"]["panelType"] == "table"

        # ── list filters by source and name ──────────────────────────────
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"source": "logs"},
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {v["name"] for v in response.json()["data"]} == {"lc-logs-overview"}

        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"source": "logs", "name": "overview"},
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert {v["name"] for v in response.json()["data"]} == {"lc-logs-overview"}

        # ── update mutates source, displayName and spec -- name is untouched
        # since it isn't even part of the update payload ─────────────────
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json={
                "source": "metrics",
                "schemaVersion": "v2",
                "spec": {
                    "displayName": "lc-logs-overview-renamed",
                    "requestType": "time_series",
                    "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                    "selectedFields": [],
                    "panelType": "graph",
                    "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
                },
            },
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        updated = response.json()["data"]
        assert updated["name"] == "lc-logs-overview", "name is immutable"
        assert updated["spec"]["displayName"] == "lc-logs-overview-renamed"
        assert updated["source"] == "metrics"
        assert updated["spec"]["panelType"] == "graph"
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


def test_empty_name_derives_a_slug_from_display_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "",
            "generateName": True,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "My Generated View!",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        got = response.json()["data"]
        assert got["spec"]["displayName"] == "My Generated View!"
        assert got["name"].startswith("my-generated-view-")
        assert got["name"] != "my-generated-view-", "expected a random suffix, not just the slugified prefix"
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


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
        json={
            "name": "create-zero-values",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "create-zero-values",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["spec"]
        query = spec["queries"][0]["spec"]

        cases = [
            ("panelType preserved", spec["panelType"], "table"),
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


def test_selected_fields_and_display_omitted_on_create_read_back_as_empty_defaults(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Neither selectedFields nor display is required. Omitting both entirely
    must not 400 or leave either null on read-back: selectedFields defaults to
    an empty list, display to its zero-value object. panelType is a separate,
    required, top-level field and is supplied here so the create succeeds."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "omitted-selected-fields-and-display",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "omitted-selected-fields-and-display",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "panelType": "table",
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["spec"]
        assert spec["selectedFields"] == []
        assert spec["display"] == {"maxLines": 0, "fontSize": "", "format": "", "color": ""}
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


def test_selected_fields_and_display_explicit_null_on_create(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """JSON null decodes as a no-op onto a non-pointer Go field (struct/slice), so
    an explicit null is expected to behave identically to omitting the field."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "null-selected-fields-and-display",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "null-selected-fields-and-display",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "panelType": "table",
                "selectedFields": None,
                "display": None,
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["spec"]
        assert spec["selectedFields"] == []
        assert spec["display"] == {"maxLines": 0, "fontSize": "", "format": "", "color": ""}
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )


def test_create_with_partial_display_defaults_missing_fields(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """display's fields are each independently optional -- sending only one
    (color) must not 400, and the fields left unset must default to their own
    zero value rather than being rejected or dropped."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "partial-display-color-only",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "partial-display-color-only",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "panelType": "table",
                "selectedFields": [],
                "display": {"color": "test"},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["spec"]["display"] == {"maxLines": 0, "fontSize": "", "format": "", "color": "test"}
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
        json={
            "name": "update-zero-values",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "update-zero-values",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": True, "legend": "Custom Legend"}}],
                "selectedFields": [{"name": "service.name"}],
                "panelType": "table",
                "display": {"maxLines": 25, "fontSize": "large", "format": "table", "color": "blue"},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["spec"]
        assert spec["display"]["maxLines"] == 25
        # signal/fieldContext/fieldDataType always serialize on TelemetryFieldKey
        # (no omitempty -- see pkg/types/telemetrytypes/field.go), so an entry sent
        # with only "name" reads back with those three as explicit "".
        assert spec["selectedFields"] == [{"name": "service.name", "signal": "", "fieldContext": "", "fieldDataType": ""}]
        assert spec["queries"][0]["spec"]["disabled"] is True

        # ── update overwrites every one of those fields down to its zero value ──
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json={
                "source": "logs",
                "schemaVersion": "v2",
                "spec": {
                    "displayName": "update-zero-values",
                    "requestType": "scalar",
                    "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}], "disabled": False, "legend": ""}}],
                    "selectedFields": [],
                    "panelType": "table",
                    "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
                },
            },
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        # ── the zero values took effect -- not retained, not dropped, not null ──
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        spec = response.json()["data"]["spec"]
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


def test_update_with_partial_display_replaces_whole_object(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Update is a whole-object replace, not a merge: sending only "color" on
    update must not preserve the previous fontSize/format/maxLines -- those
    reset to their zero value exactly as if display had been sent in full."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "update-partial-display",
            "generateName": False,
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "update-partial-display",
                "requestType": "scalar",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "selectedFields": [],
                "panelType": "table",
                "display": {"maxLines": 10, "fontSize": "large", "format": "table", "color": "blue"},
            },
        },
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    try:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            json={
                "source": "logs",
                "schemaVersion": "v2",
                "spec": {
                    "displayName": "update-partial-display",
                    "requestType": "scalar",
                    "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                    "selectedFields": [],
                    "panelType": "table",
                    "display": {"color": "green"},
                },
            },
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["spec"]["display"] == {"maxLines": 0, "fontSize": "", "format": "", "color": "green"}
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers=headers,
            timeout=5,
        )
