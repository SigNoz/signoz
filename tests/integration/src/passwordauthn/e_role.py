from typing import Tuple
import requests
from http import HTTPStatus
import requests
from typing import Callable
from fixtures import types

def test_change_role(signoz: types.SigNoz, get_tokens: Callable[[str, str], Tuple[str, str]]):
    admin_token, _ = get_tokens("admin@integration.test", "password123Z$")

    # Create a new user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "admin+rolechange@integration.test", "role": "ADMIN"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED

    # Get the invite of the new user
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    invite_response = response.json()["data"]

    found_invite = next(
        (
            invite
            for invite in invite_response
            if invite["email"] == "admin+rolechange@integration.test"
        ),
        None,
    )

    assert found_invite is not None

    # Accept the invite of the new user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "password123Z$",
            "displayName": "role change user",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    # Make some API calls as new user
    new_user_token, new_user_refresh_token = get_tokens("admin+rolechange@integration.test", "password123Z$")

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/me"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    new_user_id = response.json()["data"]["id"]
    
    # Change the new user's role
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{new_user_id}"),
        json={
            "displayName": "role change user",
            "role": "VIEWER",
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

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    # Rotate token for new user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/rotate"),
        json={
            "refreshToken": new_user_refresh_token,
        },
        headers={"Authorization": f"Bearer {new_user_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    # Make some API calls again
    rotate_response = response.json()["data"]
    new_user_token, new_user_refresh_token = rotate_response["accessToken"], rotate_response["refreshToken"]

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/me"),
        timeout=2,
        headers={"Authorization": f"Bearer {new_user_token}"},
    )

    assert response.status_code == HTTPStatus.OK
