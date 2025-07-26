from http import HTTPStatus

import pytest
import requests

from fixtures import dev, types

USER_ADMIN_NAME = "admin"
USER_ADMIN_EMAIL = "admin@integration.test"
USER_ADMIN_PASSWORD = "password"


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin(
    signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.Operation:
    def create() -> None:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/register"),
            json={
                "name": USER_ADMIN_NAME,
                "orgId": "",
                "orgName": "",
                "email": USER_ADMIN_EMAIL,
                "password": USER_ADMIN_PASSWORD,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK

        return types.Operation(name="create_user_admin")

    def delete(_: types.Operation) -> None:
        pass

    def restore(cache: dict) -> types.Operation:
        return types.Operation(name=cache["name"])

    return dev.wrap(
        request,
        pytestconfig,
        "create_user_admin",
        lambda: types.Operation(name=""),
        create,
        delete,
        restore,
    )


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
