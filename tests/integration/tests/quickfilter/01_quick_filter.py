from collections.abc import Callable
from http import HTTPStatus

import requests
from sqlalchemy import sql

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD

ALL_SOURCES = {
    "traces",
    "logs",
    "api_monitoring",
    "exceptions",
    "meter",
    "ai_observability",
}


def test_get_quick_filters_returns_defaults(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {source_filters["source"] for source_filters in data} == ALL_SOURCES

    for source_filters in data:
        assert source_filters["id"] != "00000000-0000-0000-0000-000000000000"
        assert source_filters["orgId"] != "00000000-0000-0000-0000-000000000000"
        assert source_filters["createdAt"] != ""
        assert source_filters["updatedAt"] != ""
        assert len(source_filters["filters"]) > 0
        for field_key in source_filters["filters"]:
            assert field_key["name"] != ""
            assert "fieldContext" in field_key
            assert "fieldDataType" in field_key
            assert "key" not in field_key


def test_v1_get_serves_legacy_shape(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {source_filters["signal"] for source_filters in data} == ALL_SOURCES

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters/traces"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    filters = response.json()["data"]["filters"]
    assert filters[0]["key"] == "duration_nano"
    assert filters[0]["type"] == "tag"
    assert filters[0]["dataType"] == "float64"
    assert all("name" not in legacy_filter for legacy_filter in filters)


def test_v1_update_round_trips_to_v2(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters"),
        json={
            "signal": "exceptions",
            "filters": [
                {"key": "service.name", "dataType": "string", "type": "resource"},
                {"key": "http.method", "dataType": "string", "type": "tag"},
                {"key": "code_line", "dataType": "int64", "type": "tag"},
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/exceptions"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    filters = response.json()["data"]["filters"]
    assert [(field_key["name"], field_key["fieldContext"]) for field_key in filters] == [
        ("service.name", "resource"),
        ("http.method", "attribute"),
        ("code_line", "attribute"),
    ]
    assert filters[2]["fieldDataType"] == "number"

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters/exceptions"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    filters = response.json()["data"]["filters"]
    assert [(legacy_filter["key"], legacy_filter["type"]) for legacy_filter in filters] == [
        ("service.name", "resource"),
        ("http.method", "tag"),
        ("code_line", "tag"),
    ]

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters"),
        json={
            "signal": "meter",
            "filters": [{"key": "host.name", "dataType": "string", "type": ""}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/meter"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [(field_key["name"], field_key["signal"]) for field_key in response.json()["data"]["filters"]] == [("host.name", "metrics")]


def test_update_quick_filters_round_trip(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/logs"),
        json={
            "filters": [
                {
                    "name": "k8s.pod.name",
                    "fieldContext": "resource",
                    "fieldDataType": "string",
                },
                {
                    "name": "body.status",
                    "fieldContext": "body",
                    "fieldDataType": "string",
                },
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/logs"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    filters = response.json()["data"]["filters"]
    assert [field_key["name"] for field_key in filters] == [
        "k8s.pod.name",
        "body.status",
    ]
    assert filters[0]["fieldContext"] == "resource"
    assert filters[1]["fieldContext"] == "body"

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/orgs/me/filters/logs"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [(legacy_filter["key"], legacy_filter["type"]) for legacy_filter in response.json()["data"]["filters"]] == [
        ("k8s.pod.name", "resource"),
        ("body.status", ""),
    ]


def test_update_quick_filters_creates_row_for_source_without_one(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    with signoz.sqlstore.conn.connect() as conn:
        conn.execute(
            sql.text("DELETE FROM quick_filter WHERE source = :source"),
            {"source": "api_monitoring"},
        )
        conn.commit()

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/api_monitoring"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["source"] == "api_monitoring"
    assert data["filters"] == []
    assert data["id"] == "00000000-0000-0000-0000-000000000000"

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/api_monitoring"),
        json={
            "filters": [
                {
                    "name": "service.name",
                    "fieldContext": "resource",
                    "fieldDataType": "string",
                },
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/api_monitoring"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert [field_key["name"] for field_key in data["filters"]] == ["service.name"]
    assert data["id"] != "00000000-0000-0000-0000-000000000000"


def test_update_quick_filters_rejects_invalid_input(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for source, invalid_body in [
        (
            "traces",
            {"filters": [{"key": "service.name", "dataType": "string", "type": "resource"}]},
        ),
        ("invalid", {"filters": []}),
    ]:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v2/quick_filters/{source}"),
            json=invalid_body,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=2,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
