from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from sqlalchemy import sql
from wiremock.resources.mappings import Mapping

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.types import Operation, SigNoz, TestContainerDocker


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """
    This applies a license to the signoz instance.
    """
    add_license(signoz, make_http_mocks, get_token)


def test_create_and_get_public_dashboard(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/dashboards"),
        json={
            "schemaVersion": "v6",
            "name": "sample-title",
            "spec": {"variables": [], "panels": {}, "layouts": [], "display": {"name": "Sample Title"}, "links": []},
            "tags": [],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["status"] == "success"
    data = response.json()["data"]
    dashboard_id = data["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{dashboard_id}/public"),
        json={
            "timeRangeEnabled": True,
            "defaultTimeRange": "10s",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    assert "id" in response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{dashboard_id}/public"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert response.json()["data"]["timeRangeEnabled"] is True
    assert response.json()["data"]["defaultTimeRange"] == "10s"


def test_anonymous_role_has_public_dashboard_permission(
    request: pytest.FixtureRequest,
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """
    Verify that the signoz-anonymous role has the public-dashboard/* permission.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Get the roles to find the org_id
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    roles = response.json()["data"]
    anonymous_role = next((role for role in roles if role["name"] == "signoz-anonymous"), None)
    assert anonymous_role is not None
    org_id = anonymous_role["orgId"]

    # Verify the tuple exists in the database that grants
    # signoz-anonymous role read access to public-dashboard/*
    with signoz.sqlstore.conn.connect() as conn:
        tuple_object_id = f"organization/{org_id}/public-dashboard/*"
        anonymous_role_subject = f"organization/{org_id}/role/signoz-anonymous"
        tuple_result = conn.execute(
            sql.text("SELECT * FROM tuple WHERE object_id = :object_id AND relation = :relation"),
            {"object_id": tuple_object_id, "relation": "read"},
        )

        tuple_rows = tuple_result.mappings().fetchall()
        assert len(tuple_rows) > 0

        if request.config.getoption("--sqlstore-provider") == "sqlite":
            tuple_row = next(
                (row for row in tuple_rows if row["user_object_id"] == anonymous_role_subject),
                None,
            )
        else:
            tuple_row = next(
                (row for row in tuple_rows if row["_user"] == f"role:{anonymous_role_subject}#assignee"),
                None,
            )

        assert tuple_row is not None
        assert tuple_row["object_type"] == "metaresource"
        assert tuple_row["relation"] == "read"

        if request.config.getoption("--sqlstore-provider") == "sqlite":
            assert tuple_row["user_object_type"] == "role"
            assert tuple_row["user_object_id"] == anonymous_role_subject
            assert tuple_row["user_relation"] == "assignee"
        else:
            assert tuple_row["_user"] == f"role:{anonymous_role_subject}#assignee"
