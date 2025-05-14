from http import HTTPStatus

import pytest
import requests

from fixtures import types


@pytest.fixture(name="create_first_user", scope="function")
def create_first_user(signoz: types.SigNoz) -> None:
    def _create_user(name: str, email: str, password: str) -> None:
        response = requests.post(
            signoz.self.host_config.get("/api/v1/register"),
            json={
                "name": name,
                "orgId": "",
                "orgName": "",
                "email": email,
                "password": password,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK

    return _create_user


@pytest.fixture(name="get_jwt_token", scope="module")
def get_jwt_token(signoz: types.SigNoz) -> str:
    def _get_jwt_token(email: str, password: str) -> str:
        response = requests.post(
            signoz.self.host_config.get("/api/v1/login"),
            json={
                "email": email,
                "password": password,
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK

        return response.json()["data"]["accessJwt"]

    return _get_jwt_token
