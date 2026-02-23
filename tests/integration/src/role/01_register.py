from http import HTTPStatus
from typing import Callable

import pytest
import requests
from sqlalchemy import sql

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


def test_managed_roles_create_on_register(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # get the list of all roles.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    data = response.json()["data"]

    # since this check happens immediately post registeration, all the managed roles should be present.
    assert len(data) == 4
    role_names = {role["name"] for role in data}
    expected_names = {
        "signoz-admin",
        "signoz-viewer",
        "signoz-editor",
        "signoz-anonymous",
    }
    # do the set mapping as this is order insensitive, direct list match is order-sensitive.
    assert set(role_names) == expected_names


def test_root_user_signoz_admin_assignment(
    request: pytest.FixtureRequest,
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Get the user from the /user/me endpoint and extract the id
    user_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/me"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert user_response.status_code == HTTPStatus.OK
    user_id = user_response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    # this validates to some extent that the role assignment is complete under the assumption that middleware is functioning as expected.
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    # Loop over the roles and get the org_id and id for signoz-admin role
    roles = response.json()["data"]
    admin_role_entry = next(
        (role for role in roles if role["name"] == "signoz-admin"), None
    )
    assert admin_role_entry is not None
    org_id = admin_role_entry["orgId"]

    # to be super sure of authorization server, let's validate the tuples in DB as well.
    # todo[@vikrantgupta25]: replace this with role memebers handler once built.
    with signoz.sqlstore.conn.connect() as conn:
        # verify the entry present for role assignment
        tuple_object_id = f"organization/{org_id}/role/signoz-admin"
        tuple_result = conn.execute(
            sql.text("SELECT * FROM tuple WHERE object_id = :object_id"),
            {"object_id": tuple_object_id},
        )

        tuple_row = tuple_result.mappings().fetchone()
        assert tuple_row is not None
        # check that the tuple if for role assignment
        assert tuple_row["object_type"] == "role"
        assert tuple_row["relation"] == "assignee"

        if request.config.getoption("--sqlstore-provider") == "sqlite":
            user_object_id = f"organization/{org_id}/user/{user_id}"
            assert tuple_row["user_object_type"] == "user"
            assert tuple_row["user_object_id"] == user_object_id
        else:
            _user = f"user:organization/{org_id}/user/{user_id}"
            assert tuple_row["user_type"] == "user"
            assert tuple_row["_user"] == _user


def test_anonymous_user_signoz_anonymous_assignment(
    request: pytest.FixtureRequest,
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    # this validates to some extent that the role assignment is complete under the assumption that middleware is functioning as expected.
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    # Loop over the roles and get the org_id and id for signoz-admin role
    roles = response.json()["data"]
    admin_role_entry = next(
        (role for role in roles if role["name"] == "signoz-anonymous"), None
    )
    assert admin_role_entry is not None
    org_id = admin_role_entry["orgId"]

    # to be super sure of authorization server, let's validate the tuples in DB as well.
    # todo[@vikrantgupta25]: replace this with role memebers handler once built.
    with signoz.sqlstore.conn.connect() as conn:
        # verify the entry present for role assignment
        tuple_object_id = f"organization/{org_id}/role/signoz-anonymous"
        tuple_result = conn.execute(
            sql.text("SELECT * FROM tuple WHERE object_id = :object_id"),
            {"object_id": tuple_object_id},
        )

        tuple_row = tuple_result.mappings().fetchone()
        assert tuple_row is not None
        # check that the tuple if for role assignment
        assert tuple_row["object_type"] == "role"
        assert tuple_row["relation"] == "assignee"

        if request.config.getoption("--sqlstore-provider") == "sqlite":
            user_object_id = f"organization/{org_id}/anonymous/{ANONYMOUS_USER_ID}"
            assert tuple_row["user_object_type"] == "anonymous"
            assert tuple_row["user_object_id"] == user_object_id
        else:
            _user = f"anonymous:organization/{org_id}/anonymous/{ANONYMOUS_USER_ID}"
            assert tuple_row["user_type"] == "user"
            assert tuple_row["_user"] == _user
