import base64
import json
import re
import uuid
from collections.abc import Callable
from http import HTTPStatus
from typing import NamedTuple

import pytest
import requests
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import TELEGRAM_CHAT_ID, TELEGRAM_OK_BODY, telegram_channel, telegram_path, wait_for_alertmanager_sync


# channel test (POST /api/v2/notification_channels/test) drives the notifier once,
# synchronously, with a hardcoded test alert and no retry — the deterministic place
# to assert permanent-failure behaviour. Rich messages + retry are covered in
# alertmanager/17_telegram.py. Error bodies are the Bot API's {ok, error_code, description}.
class TestChannelCase(NamedTuple):
    __test__ = False
    name: str
    bot: str
    status: int  # stub status
    body: dict  # stub body
    expected_error: str | None  # the notifier's error text, None when delivered


TEST_CHANNEL_CASES = [
    TestChannelCase("success", "tg-tc-ok", 200, TELEGRAM_OK_BODY, None),
    TestChannelCase("chat_not_found_400", "tg-tc-400", 400, {"ok": False, "error_code": 400, "description": "Bad Request: chat not found"}, "unexpected status code 400"),
    TestChannelCase("unauthorized_401", "tg-tc-401", 401, {"ok": False, "error_code": 401, "description": "Unauthorized"}, "unexpected status code 401"),
]


@pytest.mark.parametrize(
    "case",
    TEST_CHANNEL_CASES,
    ids=lambda c: c.name,
)
def test_telegram_test_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    case: TestChannelCase,
) -> None:
    path = telegram_path(case.bot)
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=path),
                response=MappingResponse(status=case.status, json_body=case.body),
            )
        ],
    )

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/notification_channels/test"),
        json={"config": telegram_channel(str(uuid.uuid4()), case.bot, notification_channel)["config"]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )

    if case.expected_error is None:
        assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"
    else:
        # a Bot API error surfaces as a 500 (untyped notify error) whose body
        # carries the status code and the Bot API's description
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"expected 500, got {response.status_code}: {response.text}"
        assert case.expected_error in response.text, f"expected {case.expected_error!r} in error body: {response.text}"
        assert case.body["description"] in response.text, f"expected {case.body['description']!r} in error body: {response.text}"

    # exactly one delivery attempt either way (testChannel never retries)
    count = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    assert count.json()["count"] == 1, f"expected exactly 1 request (no retry), got {count.text}"

    find = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/find"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    req = find.json()["requests"][0]
    # the bot token travels in the path, appended to the configured api url
    assert req["url"] == path, f"expected {path}, got {req['url']}"

    message = json.loads(base64.b64decode(req["bodyAsBase64"]).decode("utf-8"))
    assert message["chat_id"] == str(TELEGRAM_CHAT_ID)
    assert message["parse_mode"] == "HTML"
    assert re.search(r"<b>\[FIRING:1\] Test Alert \(", message["text"]), f"unexpected text: {message['text']}"
