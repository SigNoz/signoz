import http
import json

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures.types import SigNoz


def test_apply_license(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None:
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

    access_token = get_jwt_token("admin@integration.test", "password")

    response = requests.post(
        url=signoz.self.host_config.get("/api/v3/licenses"),
        json={"key": "secret-key"},
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    assert response.status_code == http.HTTPStatus.ACCEPTED

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "GET", "url": "/v2/licenses/me"},
        timeout=5,
    )

    assert response.json()["count"] == 1


def test_refresh_license(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None:
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
                            "valid_from": 1732146922,
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

    access_token = get_jwt_token("admin@integration.test", "password")

    response = requests.put(
        url=signoz.self.host_config.get("/api/v3/licenses"),
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    assert response.status_code == http.HTTPStatus.NO_CONTENT

    cursor = signoz.sqlstore.conn.cursor()
    cursor.execute(
        "SELECT data FROM license WHERE id='0196360e-90cd-7a74-8313-1aa815ce2a67'"
    )
    record = cursor.fetchone()[0]
    assert json.loads(record)["valid_from"] == 1732146922

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "GET", "url": "/v2/licenses/me"},
        timeout=5,
    )

    assert response.json()["count"] == 1


def test_license_checkout(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None:
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v2/subscriptions/me/sessions/checkout",
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
                        "data": {"url": "https://signoz.checkout.com"},
                    },
                ),
                persistent=False,
            )
        ],
    )

    access_token = get_jwt_token("admin@integration.test", "password")

    response = requests.post(
        url=signoz.self.host_config.get("/api/v1/checkout"),
        json={"url": "https://integration-signoz.com"},
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    assert response.status_code == http.HTTPStatus.CREATED
    assert response.json()["data"]["redirectURL"] == "https://signoz.checkout.com"

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "POST", "url": "/v2/subscriptions/me/sessions/checkout"},
        timeout=5,
    )

    assert response.json()["count"] == 1


def test_license_portal(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None:
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v2/subscriptions/me/sessions/portal",
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
                        "data": {"url": "https://signoz.portal.com"},
                    },
                ),
                persistent=False,
            )
        ],
    )

    access_token = get_jwt_token("admin@integration.test", "password")

    response = requests.post(
        url=signoz.self.host_config.get("/api/v1/portal"),
        json={"url": "https://integration-signoz.com"},
        headers={"Authorization": "Bearer " + access_token},
        timeout=5,
    )

    assert response.status_code == http.HTTPStatus.CREATED
    assert response.json()["data"]["redirectURL"] == "https://signoz.portal.com"

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "POST", "url": "/v2/subscriptions/me/sessions/portal"},
        timeout=5,
    )

    assert response.json()["count"] == 1
