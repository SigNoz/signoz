from http import HTTPStatus

import requests

from fixtures import types


def test_register(signoz: types.SigNoz) -> None:
    response = requests.get(signoz.self.host_config.get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is False

    response = requests.post(
        signoz.self.host_config.get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "",
            "email": "admin@admin.com",
            "password": "password",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(signoz.self.host_config.get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True
