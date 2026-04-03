from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types


def test_change_role(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
):
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Create a new user as VIEWER
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "admin+rolechange@integration.test", "role": "VIEWER"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED

    invited_user = response.json()["data"]
    reset_token = invited_user["token"]

    # Activate user via reset password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Make some API calls as new user
    new_user_token = get_token("admin+rolechange@integration.test", "password123Z$")

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/me"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    new_user_id = response.json()["data"]["id"]

    # Make some API call which is protected
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/org/preferences"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.FORBIDDEN

    # Change the new user's role - move to ADMIN
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{new_user_id}"),
        json={
            "displayName": "role change user",
            "role": "ADMIN",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    # Make some API calls again
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/me"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/org/preferences"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK
