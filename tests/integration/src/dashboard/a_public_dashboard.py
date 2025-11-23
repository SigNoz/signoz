from http import HTTPStatus
from typing import Callable, List
from wiremock.resources.mappings import Mapping
import requests
from sqlalchemy import sql

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD,add_license
from fixtures.types import Operation, SigNoz,TestContainerDocker


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, List[Mapping]], None],
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

    # Get domains which should be an empty list
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        json={
            "title": "Sample Title",
            "uploadedGrafana": False,
            "version": "v5"
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["status"] == "success"
    data = response.json()["data"]
    id = data["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{id}/public"),
        json={
            "timeRangeEnabled": True,
            "defaultTimeRange": "10s",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{id}/public"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert response.json()["data"]["timeRangeEnabled"] == True
    assert response.json()["data"]["defaultTimeRange"] == "10s"
    public_path = response.json()["data"]["publicPath"]
    assert public_path.startswith("/public/dashboard/")
    public_dashboard_id = public_path.split("/public/dashboard/")[-1]

    row = None    
    with signoz.sqlstore.conn.connect() as conn:
        # verify the role creation
        result = conn.execute(
            sql.text("SELECT * FROM role WHERE name = :role"),
            {"role": "signoz-anonymous"}
        )
        row = result.mappings().fetchone()
        assert row is not None
        assert row["name"] == "signoz-anonymous"

        # verify the tuple creation for role
        tuple_object_id = f"organization/{row["org_id"]}/role/{row["id"]}"
        tuple_result = conn.execute(
            sql.text("SELECT * FROM tuple WHERE object_id = :object_id"),
            {"object_id": tuple_object_id}
        )
        tuple_row = tuple_result.fetchone()
        assert tuple_row is not None

        # verify the tuple creation for public-dashboard
        tuple_object_id = f"organization/{row["org_id"]}/public-dashboard/{public_dashboard_id}"
        tuple_result = conn.execute(
            sql.text("SELECT * FROM tuple WHERE object_id = :object_id"),
            {"object_id": tuple_object_id}
        )
        tuple_row = tuple_result.fetchone()
        assert tuple_row is not None
        
    