import http

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures.types import SigNoz

def test_stripe_checkout(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None: 
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
                        "data": {
                            "url": "https://signoz.stripe.com"
                        },
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
    

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["data"]["redirectURL"] == "https://signoz.stripe-checkout.com"

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "POST", "url": "/v2/subscriptions/me/sessions/checkout"},
        timeout=5,
    )

    assert response.json()["count"] >= 1

def test_stripe_portal(signoz: SigNoz, make_http_mocks, get_jwt_token) -> None: 
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
                        "data": {
                            "url": "https://signoz.stripe-portal.com"
                        },
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
    

    assert response.status_code == http.HTTPStatus.OK
    assert response.json()["data"]["redirectURL"] == "https://signoz.stripe-portal.com"

    response = requests.post(
        url=signoz.zeus.host_config.get("/__admin/requests/count"),
        json={"method": "POST", "url": "/v2/subscriptions/me/sessions/portal"},
        timeout=5,
    )

    assert response.json()["count"] >= 1