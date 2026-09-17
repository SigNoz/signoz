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
from fixtures.alerts import update_raw_channel_config
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.notification_channel import (
    JSMOPS_API_BASE,
    JSMOPS_NOTES_PATH_PATTERN,
    JSMOPS_TEST_API_KEY,
    find_requests,
    jsmops_config,
    jsmops_create_mapping,
    jsmops_notes_mapping,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

# channel test (POST /api/v1/channels/test) drives the notifier once, synchronously,
# with a hardcoded firing test alert and no retry: create alert on the JSM Ops
# gateway, then append a timeline note. Default-template events + retry are in
# alertmanager/07_jsmops.py.


def test_jsmops_create_alert_with_note(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(notification_channel, [jsmops_create_mapping(), jsmops_notes_mapping()])

    receiver = update_raw_channel_config(jsmops_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    creates = find_requests(notification_channel, "POST", f"{JSMOPS_API_BASE}/v2/alerts")
    assert len(creates) == 1
    # GenieKey auth on every call (header name lowercased on the wire by h2)
    headers = {name.lower(): value for name, value in creates[0]["headers"].items()}
    assert headers.get("authorization") == f"GenieKey {JSMOPS_TEST_API_KEY}", f"expected GenieKey auth, got {headers.get('authorization')}"
    alert = json.loads(base64.b64decode(creates[0]["bodyAsBase64"]).decode("utf-8"))
    assert alert["alias"], "alias carries the group hash for dedup/close"
    assert re.search(r"\[FIRING:1\] Test Alert \(", alert["message"]), alert["message"]
    assert alert["source"] == "SigNoz"
    assert alert["tags"] == ["signoz"]
    # advanced treatment renders the default body as HTML
    assert "<div>" in alert["description"], alert["description"]

    notes = find_requests(notification_channel, "POST", path_pattern=JSMOPS_NOTES_PATH_PATTERN)
    assert len(notes) == 1
    assert notes[0]["queryParams"]["identifierType"]["values"] == ["alias"]
    note = json.loads(base64.b64decode(notes[0]["bodyAsBase64"]).decode("utf-8"))
    assert note["source"] == "SigNoz"
    assert note["note"].strip(), "the timeline note carries the plain-text snapshot"


def test_jsmops_failed_note_does_not_fail_delivery(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    # notes are enrichment: a permanent note failure (e.g. the first-fire note
    # racing JSM's async alert create) is dropped and the delivery still succeeds
    make_http_mocks(
        notification_channel,
        [
            jsmops_create_mapping(),
            jsmops_notes_mapping(status=404, body={"message": "Alert with id/alias does not exist", "took": 0.001, "requestId": "x"}),
        ],
    )

    receiver = update_raw_channel_config(jsmops_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204 despite the failed note, got {response.status_code}: {response.text}"

    assert len(find_requests(notification_channel, "POST", f"{JSMOPS_API_BASE}/v2/alerts")) == 1
    assert len(find_requests(notification_channel, "POST", path_pattern=JSMOPS_NOTES_PATH_PATTERN)) == 1


class PermanentErrorCase(NamedTuple):
    __test__ = False
    name: str
    status: int
    body: dict


PERMANENT_ERROR_CASES = [
    PermanentErrorCase("create_422", 422, {"message": "Message can not be empty.", "took": 0.001, "requestId": "x"}),
    PermanentErrorCase("create_401", 401, {"message": "Could not authenticate.", "took": 0.001, "requestId": "x"}),
]


@pytest.mark.parametrize(
    "case",
    PERMANENT_ERROR_CASES,
    ids=lambda c: c.name,
)
def test_jsmops_permanent_error(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    case: PermanentErrorCase,
) -> None:
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=f"{JSMOPS_API_BASE}/v2/alerts"),
                response=MappingResponse(status=case.status, json_body=case.body),
            ),
            jsmops_notes_mapping(),
        ],
    )

    receiver = update_raw_channel_config(jsmops_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    # a downstream 4xx on the create surfaces as a 500 (untyped notify error)
    # whose body carries the real downstream status code; testChannel never retries
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"expected 500, got {response.status_code}: {response.text}"
    assert f"unexpected status code {case.status}" in response.text, response.text

    assert len(find_requests(notification_channel, "POST", f"{JSMOPS_API_BASE}/v2/alerts")) == 1
    # the request loop stops at the failed create, so the note is never attempted
    assert len(find_requests(notification_channel, "POST", path_pattern=JSMOPS_NOTES_PATH_PATTERN)) == 0
