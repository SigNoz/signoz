from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_get_user_preference(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user/preferences"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"] is not None


def test_get_set_user_preference_by_name(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # preference does not exist
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v1/user/preferences/somenonexistentpreference"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    # This should be NOT_FOUND
    assert response.status_code == HTTPStatus.BAD_REQUEST

    # get preference by name
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v1/user/preferences/welcome_checklist_do_later"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"] is not None
    assert response.json()["data"]["defaultValue"] is False
    assert response.json()["data"]["value"] is False

    # play with welcome_checklist_do_later preference
    response = requests.put(
        signoz.self.host_configs["8080"].get(
            "/api/v1/user/preferences/welcome_checklist_do_later"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"value": True},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    # get preference by name
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            "/api/v1/user/preferences/welcome_checklist_do_later"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"] is not None
    assert response.json()["data"]["value"] is True
