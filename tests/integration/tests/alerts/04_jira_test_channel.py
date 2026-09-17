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
    JIRA_API_BASE,
    JIRA_SA_EMAIL,
    JIRA_TEST_EMAIL,
    JIRA_TEST_TOKEN,
    find_requests,
    jira_comment_mapping,
    jira_config,
    jira_create_mapping,
    jira_search_issue,
    jira_search_mapping,
    jira_transition_post_mapping,
    jira_transitions_mapping,
    jira_update_mapping,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

# channel test (POST /api/v1/channels/test) drives the notifier once, synchronously,
# with a hardcoded firing test alert and no retry. The search stub decides which
# branch runs (create / update / reopen), so the whole issue lifecycle is
# deterministic here; default-template events + retry are in alertmanager/06_jira.py.

BASIC_AUTH = "Basic " + base64.b64encode(f"{JIRA_TEST_EMAIL}:{JIRA_TEST_TOKEN}".encode()).decode()


def test_jira_create_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(notification_channel, [jira_search_mapping([]), jira_create_mapping()])

    receiver = update_raw_channel_config(jira_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    searches = find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/search/jql")
    assert len(searches) == 1
    # basic auth on every call (header name lowercased on the wire by h2)
    headers = {name.lower(): value for name, value in searches[0]["headers"].items()}
    assert headers.get("authorization") == BASIC_AUTH, f"expected basic auth, got {headers.get('authorization')}"
    jql = json.loads(base64.b64decode(searches[0]["bodyAsBase64"]).decode("utf-8"))["jql"]
    assert 'project="OPS"' in jql, jql
    assert 'labels="ALERT{' in jql, jql
    # default reopen_duration (72h) becomes the firing reopen window
    assert "resolutiondate >= -4320m" in jql, jql

    creates = find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue")
    assert len(creates) == 1
    fields = json.loads(base64.b64decode(creates[0]["bodyAsBase64"]).decode("utf-8"))["fields"]
    assert fields["project"] == {"key": "OPS"}
    assert fields["issuetype"] == {"name": "Task"}
    assert re.search(r"\[FIRING:1\] Test Alert \(", fields["summary"]), fields["summary"]
    assert "signoz-alert" in fields["labels"]
    assert any(label.startswith("ALERT{") for label in fields["labels"]), fields["labels"]
    # ADF body leads with the firing status panel
    panel = fields["description"]["content"][0]
    assert panel["attrs"] == {"panelType": "error"}
    assert panel["content"][0]["content"][0]["text"] == "🔴 FIRING"


def test_jira_wont_fix_resolution_in_search_jql(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(notification_channel, [jira_search_mapping([]), jira_create_mapping()])

    receiver = update_raw_channel_config(jira_config(wont_fix_resolution="Won't Do"), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    searches = find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/search/jql")
    assert len(searches) == 1
    jql = json.loads(base64.b64decode(searches[0]["bodyAsBase64"]).decode("utf-8"))["jql"]
    # issues resolved as won't-fix stay closed: the search skips them so a
    # refire creates a fresh issue instead of reopening
    assert '(resolution is EMPTY or resolution != "Won\'t Do")' in jql, jql


def test_jira_updates_existing_open_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(
        notification_channel,
        [
            jira_search_mapping([jira_search_issue("OPS-7", done=False, labels=["user-added", "signoz-alert"])]),
            jira_update_mapping("OPS-7"),
            jira_comment_mapping("OPS-7"),
        ],
    )

    receiver = update_raw_channel_config(jira_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    # still-firing group with an open issue: refresh + comment, no create, no transition
    updates = find_requests(notification_channel, "PUT", f"{JIRA_API_BASE}/issue/OPS-7")
    assert len(updates) == 1
    fields = json.loads(base64.b64decode(updates[0]["bodyAsBase64"]).decode("utf-8"))["fields"]
    assert "user-added" in fields["labels"], f"user-added labels must survive the update: {fields['labels']}"
    assert "signoz-alert" in fields["labels"]
    assert "project" not in fields and "issuetype" not in fields, "create-only fields must not be sent on update"

    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue")) == 0
    assert len(find_requests(notification_channel, "GET", f"{JIRA_API_BASE}/issue/OPS-7/transitions")) == 0

    comments = find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue/OPS-7/comment")
    assert len(comments) == 1
    body = json.loads(base64.b64decode(comments[0]["bodyAsBase64"]).decode("utf-8"))["body"]
    assert body["content"][0]["attrs"] == {"panelType": "error"}, "comment carries the same ADF snapshot"


def test_jira_reopens_done_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(
        notification_channel,
        [
            jira_search_mapping([jira_search_issue("OPS-7", done=True, labels=["signoz-alert"])]),
            jira_update_mapping("OPS-7"),
            jira_transitions_mapping(
                "OPS-7",
                [
                    {"id": "31", "name": "Done", "to": {"statusCategory": {"key": "done"}}},
                    {"id": "11", "name": "To Do", "to": {"statusCategory": {"key": "new"}}},
                ],
            ),
            jira_transition_post_mapping("OPS-7"),
            jira_comment_mapping("OPS-7"),
        ],
    )

    receiver = update_raw_channel_config(jira_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    # firing group whose issue is done: update, then transition out of done, then comment
    assert len(find_requests(notification_channel, "PUT", f"{JIRA_API_BASE}/issue/OPS-7")) == 1
    transitions = find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue/OPS-7/transitions")
    assert len(transitions) == 1
    body = json.loads(base64.b64decode(transitions[0]["bodyAsBase64"]).decode("utf-8"))
    assert body == {"transition": {"id": "11"}}, f"expected the not-done transition to be applied: {body}"
    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue/OPS-7/comment")) == 1
    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue")) == 0


class PermanentErrorCase(NamedTuple):
    __test__ = False
    name: str
    mappings: list[Mapping]
    downstream_status: int
    search_count: int
    create_count: int


PERMANENT_ERROR_CASES = [
    PermanentErrorCase(
        name="create_400",
        mappings=[
            jira_search_mapping([]),
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=f"{JIRA_API_BASE}/issue"),
                response=MappingResponse(status=400, json_body={"errorMessages": [], "errors": {"issuetype": "The issue type selected is invalid."}}),
            ),
        ],
        downstream_status=400,
        search_count=1,
        create_count=1,
    ),
    PermanentErrorCase(
        name="search_401",
        mappings=[
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=f"{JIRA_API_BASE}/search/jql"),
                response=MappingResponse(status=401, json_body={"errorMessages": ["Client must be authenticated to access this resource."]}),
            ),
        ],
        downstream_status=401,
        search_count=1,
        create_count=0,
    ),
]


@pytest.mark.parametrize(
    "case",
    PERMANENT_ERROR_CASES,
    ids=lambda c: c.name,
)
def test_jira_permanent_error(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    case: PermanentErrorCase,
) -> None:
    make_http_mocks(notification_channel, case.mappings)

    receiver = update_raw_channel_config(jira_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    # a downstream 4xx surfaces as a 500 (untyped notify error) whose body
    # carries the real downstream status code; testChannel never retries
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"expected 500, got {response.status_code}: {response.text}"
    assert f"unexpected status code {case.downstream_status}" in response.text, response.text

    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/search/jql")) == case.search_count
    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue")) == case.create_count


def test_jira_service_account_uses_gateway(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    cloud_id = "b8e7c297-4c56-4d39-9e1a-000000000001"
    gateway_base = f"/ex/jira/{cloud_id}/rest/api/3"
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.GET, url_path="/_edge/tenant_info"),
                response=MappingResponse(status=200, json_body={"cloudId": cloud_id}),
            ),
            jira_search_mapping([], base=gateway_base),
            jira_create_mapping(base=gateway_base),
        ],
    )

    receiver = update_raw_channel_config(
        jira_config(http_config={"basic_auth": {"username": JIRA_SA_EMAIL, "password": JIRA_TEST_TOKEN}}),
        str(uuid.uuid4()),
        notification_channel,
    )
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_org_registration(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    # cloud id resolved from the site's tenant_info, then every API call goes
    # through the api.atlassian.com gateway instead of the site host
    assert len(find_requests(notification_channel, "GET", "/_edge/tenant_info")) == 1
    assert len(find_requests(notification_channel, "POST", f"{gateway_base}/search/jql")) == 1
    assert len(find_requests(notification_channel, "POST", f"{gateway_base}/issue")) == 1
    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/search/jql")) == 0
