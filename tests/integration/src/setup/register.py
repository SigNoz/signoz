from fixtures import types
import requests
from http import HTTPStatus


def test_register(signoz: types.SigNoz) -> None:
    response = requests.get(signoz.self.host_config.get_url("/api/v1/version"))

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] == False

    response = requests.post(
        signoz.self.host_config.get_url("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "",
            "email": "admin@test.com",
            "password": "password",
        },
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(signoz.self.host_config.get_url("/api/v1/version"))

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] == True
