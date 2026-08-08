"""Google Chat coverage for the testChannel API (POST /api/v1/testChannel).

testChannel drives the notifier once, synchronously, with a hardcoded test alert
and no retry. It is the button users click in the UI, and the deterministic place
to assert permanent-failure / no-retry behaviour. Rich-card and retry behaviour is
covered via the firing-rule path in alertmanager/04_googlechat.py.
"""

import base64
import json
import re
import time
import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import update_raw_channel_config
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.notification_channel import googlechat_config

logger = setup_logger(__name__)


def _path(space: str) -> str:
    return f"/v1/spaces/{space}/messages"


# name, space, stub status, stub body, expect testChannel 204
TEST_CHANNEL_CASES = [
    ("googlechat_test_channel_success", "gc-tc-ok", 200, {"name": "spaces/x/messages/x"}, True),
    ("googlechat_test_channel_permanent_400", "gc-tc-400", 400, {"error": {"code": 400, "status": "INVALID_ARGUMENT", "message": "Message cannot be empty."}}, False),
    ("googlechat_test_channel_permission_403", "gc-tc-403", 403, {"error": {"code": 403, "status": "PERMISSION_DENIED", "message": "Method doesn't allow unregistered callers"}}, False),
]


@pytest.mark.parametrize(
    "name,space,status,body,expect_delivered",
    TEST_CHANNEL_CASES,
    ids=lambda v: v if isinstance(v, str) else "",
)
def test_googlechat_test_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    name: str,  # pylint: disable=unused-argument
    space: str,
    status: int,
    body: dict,
    expect_delivered: bool,
) -> None:
    path = _path(space)
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=path),
                response=MappingResponse(status=status, json_body=body),
                persistent=True,
            )
        ],
    )

    channel_name = str(uuid.uuid4())
    receiver = update_raw_channel_config(googlechat_config(space), channel_name, notification_channel)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # org registration in alertmanager
    time.sleep(10)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/testChannel"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )

    if expect_delivered:
        assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"
    else:
        # a 400/403 is a permanent failure: testChannel surfaces it, does not retry
        assert response.status_code != HTTPStatus.NO_CONTENT, f"expected failure status, got 204 for {status} stub"

    # exactly one delivery attempt either way (testChannel never retries)
    count = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    assert count.json()["count"] == 1, f"expected exactly 1 request (no retry), got {count.text}"

    if expect_delivered:
        find = requests.post(
            notification_channel.host_configs["8080"].get("/__admin/requests/find"),
            json={"method": "POST", "urlPath": path},
            timeout=10,
        )
        req = find.json()["requests"][0]
        # threading query params are always appended
        assert "messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD" in req["url"]
        assert "threadKey=" in req["url"]
        # cardsV2 shape with the hardcoded test alert
        card = json.loads(base64.b64decode(req["bodyAsBase64"]).decode("utf-8"))
        assert card["cardsV2"][0]["cardId"] == "signoz-alert"
        assert re.search(r"Test Alert \(", card["cardsV2"][0]["card"]["header"]["title"])
