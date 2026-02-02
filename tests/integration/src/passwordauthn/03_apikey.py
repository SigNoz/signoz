from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types


def test_api_key(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token("admin@integration.test", "password123Z$")

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/pats"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "admin",
            "role": "ADMIN",
            "expiresInDays": 1,
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    pat_response = response.json()
    assert "data" in pat_response
    assert "token" in pat_response["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"SIGNOZ-API-KEY": f"{pat_response["data"]["token"]}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()
    found_user = next(
        (
            user
            for user in user_response["data"]
            if user["email"] == "admin@integration.test"
        ),
        None,
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/pats"),
        headers={"SIGNOZ-API-KEY": f"{pat_response["data"]["token"]}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert "data" in response.json()

    found_pat = next(
        (pat for pat in response.json()["data"] if pat["userId"] == found_user["id"]),
        None,
    )

    assert found_pat is not None
    assert found_pat["userId"] == found_user["id"]
    assert found_pat["name"] == "admin"
    assert found_pat["role"] == "ADMIN"
