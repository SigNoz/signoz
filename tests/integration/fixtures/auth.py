from typing import Tuple
from http import HTTPStatus
from typing import Callable, List

import pytest
import requests
from wiremock.resources.mappings import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

USER_ADMIN_NAME = "admin"
USER_ADMIN_EMAIL = "admin@integration.test"
USER_ADMIN_PASSWORD = "password123Z$"


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin(
    signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.Operation:
    def create() -> None:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/register"),
            json={
                "name": USER_ADMIN_NAME,
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


@pytest.fixture(name="get_session_context", scope="function")
def get_session_context(signoz: types.SigNoz) -> Callable[[str, str], str]:
    def _get_session_context(email: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        return response.json()["data"]

    return _get_session_context


@pytest.fixture(name="get_token", scope="function")
def get_token(signoz: types.SigNoz) -> Callable[[str, str], str]:
    def _get_token(email: str, password: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        org_id = response.json()["data"]["orgs"][0]["id"]

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
            json={
                "email": email,
                "password": password,
                "orgId": org_id,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        return response.json()["data"]["accessToken"]

    return _get_token


@pytest.fixture(name="get_tokens", scope="function")
def get_tokens(signoz: types.SigNoz) -> Callable[[str, str], Tuple[str, str]]:
    def _get_tokens(email: str, password: str) -> str:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
            params={
                "email": email,
                "ref": f"{signoz.self.host_configs['8080'].base()}",
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        org_id = response.json()["data"]["orgs"][0]["id"]

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
            json={
                "email": email,
                "password": password,
                "orgId": org_id,
            },
            timeout=5,
        )

        assert response.status_code == HTTPStatus.OK
        accessToken = response.json()["data"]["accessToken"]
        refreshToken = response.json()["data"]["refreshToken"]
        return accessToken, refreshToken

    return _get_tokens


# This is not a fixture purposefully, we just want to add a license to the signoz instance.
# This is also idempotent in nature.
def add_license(
    signoz: types.SigNoz,
    make_http_mocks: Callable[[types.TestContainerDocker, List[Mapping]], None],
    get_token: Callable[[str, str], str],  # pylint: disable=redefined-outer-name
) -> None:
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/licenses/me",
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        }
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "id": "0196360e-90cd-7a74-8313-1aa815ce2a67",
                            "key": "secret-key",
                            "valid_from": 1732146923,
                            "valid_until": -1,
                            "status": "VALID",
                            "state": "EVALUATING",
                            "plan": {
                                "name": "ENTERPRISE",
                            },
                            "platform": "CLOUD",
                            "features": [],
                            "event_queue": {},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    access_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        url=signoz.self.host_configs["8080"].get("/api/v3/licenses"),
        json={"key": "secret-key"},
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    if response.status_code == HTTPStatus.CONFLICT:
        return

    assert response.status_code == HTTPStatus.ACCEPTED

    response = requests.post(
        url=signoz.zeus.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "GET", "url": "/v2/licenses/me"},
        timeout=5,
    )

    assert response.json()["count"] == 1
