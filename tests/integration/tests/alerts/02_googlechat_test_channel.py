import base64
import json
import re
import time
import uuid
from collections.abc import Callable
from http import HTTPStatus
from typing import NamedTuple

import pytest
import requests
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import update_raw_channel_config
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.notification_channel import googlechat_config

logger = setup_logger(__name__)


# channel test (POST /api/v1/channels/test) drives the notifier once, synchronously,
# with a hardcoded test alert and no retry — the deterministic place to assert
# permanent-failure behaviour. Rich cards + retry are covered in alertmanager/04_googlechat.py.
class TestChannelCase(NamedTuple):
    __test__ = False
    name: str
    space: str
    status: int  # stub status
    body: dict  # stub body
    expect_delivered: bool  # expect channels/test 204


TEST_CHANNEL_CASES = [
    TestChannelCase("success", "gc-tc-ok", 200, {"name": "spaces/x/messages/x"}, True),
    TestChannelCase("permanent_400", "gc-tc-400", 400, {"error": {"code": 400, "status": "INVALID_ARGUMENT", "message": "Message cannot be empty."}}, False),
    TestChannelCase("permission_403", "gc-tc-403", 403, {"error": {"code": 403, "status": "PERMISSION_DENIED", "message": "Method doesn't allow unregistered callers"}}, False),
]


@pytest.mark.parametrize(
    "case",
    TEST_CHANNEL_CASES,
    ids=lambda c: c.name,
)
def test_googlechat_test_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    case: TestChannelCase,
) -> None:
    path = f"/v1/spaces/{case.space}/messages"
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=path),
                response=MappingResponse(status=case.status, json_body=case.body),
            )
        ],
    )

    channel_name = str(uuid.uuid4())
    receiver = update_raw_channel_config(googlechat_config(case.space), channel_name, notification_channel)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # channels/test 404s until the org's alertmanager registers (one poll tick),
    # without reaching the notifier — so the first non-404 response is the single
    # authoritative delivery attempt and the count == 1 assertion below holds
    deadline = time.time() + 60
    while True:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
            json=receiver,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        if response.status_code != HTTPStatus.NOT_FOUND or time.time() > deadline:
            break
        time.sleep(2)

    if case.expect_delivered:
        assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"
    else:
        # a downstream 400/403 surfaces as a 500 (untyped notify error) whose body
        # carries the real downstream status code; pin it to distinguish 400 vs 403
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"expected 500, got {response.status_code}: {response.text}"
        assert f"unexpected status code {case.status}" in response.text, f"expected downstream {case.status} in error body: {response.text}"

    # exactly one delivery attempt either way (testChannel never retries)
    count = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    assert count.json()["count"] == 1, f"expected exactly 1 request (no retry), got {count.text}"

    if case.expect_delivered:
        find = requests.post(
            notification_channel.host_configs["8080"].get("/__admin/requests/find"),
            json={"method": "POST", "urlPath": path},
            timeout=10,
        )
        req = find.json()["requests"][0]
        # the configured webhook url is posted verbatim, nothing appended
        assert req["url"] == path, f"expected webhook url {path} posted verbatim, got {req['url']}"
        # cardsV2 shape with the hardcoded test alert
        card = json.loads(base64.b64decode(req["bodyAsBase64"]).decode("utf-8"))
        assert card["cardsV2"][0]["cardId"] == "signoz-alert"
        assert re.search(r"Test Alert \(", card["cardsV2"][0]["card"]["header"]["title"])
