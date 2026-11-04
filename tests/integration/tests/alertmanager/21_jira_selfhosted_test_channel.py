import base64
import json
import re
import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.alerts import update_raw_channel_config
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import (
    JIRA_API_BASE,
    JIRA_SELFHOSTED_API_BASE,
    JIRA_SELFHOSTED_SEARCH_PATH,
    JIRA_TEST_PAT,
    find_requests,
    jira_comment_mapping,
    jira_create_mapping,
    jira_search_issue,
    jira_search_mapping,
    jira_selfhosted_config,
    jira_transition_post_mapping,
    jira_transitions_mapping,
    jira_update_mapping,
    wait_for_alertmanager_sync,
)

BEARER_AUTH = f"Bearer {JIRA_TEST_PAT}"
FIRING_PANEL = "{panel:bgColor=#ffebe6}*🔴 FIRING*{panel}"


def test_jira_selfhosted_create_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(
        notification_channel,
        [
            jira_search_mapping([], base=JIRA_SELFHOSTED_API_BASE, search_path=JIRA_SELFHOSTED_SEARCH_PATH),
            jira_create_mapping(base=JIRA_SELFHOSTED_API_BASE),
        ],
    )

    receiver = update_raw_channel_config(jira_selfhosted_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    searches = find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}{JIRA_SELFHOSTED_SEARCH_PATH}")
    assert len(searches) == 1
    headers = {name.lower(): value for name, value in searches[0]["headers"].items()}
    assert headers.get("authorization") == BEARER_AUTH, f"expected the PAT as a bearer header, got {headers.get('authorization')}"
    jql = json.loads(base64.b64decode(searches[0]["bodyAsBase64"]).decode("utf-8"))["jql"]
    assert 'project="OPS"' in jql, jql
    assert 'labels="ALERT{' in jql, jql
    assert "resolutiondate >= -4320m" in jql, jql

    creates = find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue")
    assert len(creates) == 1
    headers = {name.lower(): value for name, value in creates[0]["headers"].items()}
    assert headers.get("authorization") == BEARER_AUTH
    fields = json.loads(base64.b64decode(creates[0]["bodyAsBase64"]).decode("utf-8"))["fields"]
    assert fields["project"] == {"key": "OPS"}
    assert fields["issuetype"] == {"name": "Task"}
    assert re.search(r"\[FIRING:1\] Test Alert \(", fields["summary"]), fields["summary"]
    assert "signoz-alert" in fields["labels"]
    assert isinstance(fields["description"], str), fields["description"]
    assert fields["description"].startswith(FIRING_PANEL), fields["description"]
    assert "*Alert:*" in fields["description"], fields["description"]

    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/search/jql")) == 0
    assert len(find_requests(notification_channel, "POST", f"{JIRA_API_BASE}/issue")) == 0
    assert len(find_requests(notification_channel, "GET", "/_edge/tenant_info")) == 0


def test_jira_selfhosted_updates_existing_open_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(
        notification_channel,
        [
            jira_search_mapping(
                [jira_search_issue("OPS-7", done=False, labels=["user-added", "signoz-alert"])],
                base=JIRA_SELFHOSTED_API_BASE,
                search_path=JIRA_SELFHOSTED_SEARCH_PATH,
            ),
            jira_update_mapping("OPS-7", base=JIRA_SELFHOSTED_API_BASE),
            jira_comment_mapping("OPS-7", base=JIRA_SELFHOSTED_API_BASE),
        ],
    )

    receiver = update_raw_channel_config(jira_selfhosted_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    updates = find_requests(notification_channel, "PUT", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-7")
    assert len(updates) == 1
    fields = json.loads(base64.b64decode(updates[0]["bodyAsBase64"]).decode("utf-8"))["fields"]
    assert "user-added" in fields["labels"], f"user-added labels must survive the update: {fields['labels']}"
    assert "signoz-alert" in fields["labels"]
    assert "project" not in fields and "issuetype" not in fields, "create-only fields must not be sent on update"
    assert isinstance(fields["description"], str) and fields["description"].startswith(FIRING_PANEL)

    assert len(find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue")) == 0
    assert len(find_requests(notification_channel, "GET", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-7/transitions")) == 0

    comments = find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-7/comment")
    assert len(comments) == 1
    body = json.loads(base64.b64decode(comments[0]["bodyAsBase64"]).decode("utf-8"))["body"]
    assert isinstance(body, str) and body.startswith(FIRING_PANEL), "comment carries the same wiki markup snapshot"


def test_jira_selfhosted_reopens_done_issue(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
) -> None:
    make_http_mocks(
        notification_channel,
        [
            jira_search_mapping(
                [jira_search_issue("OPS-9", done=True, labels=["signoz-alert"])],
                base=JIRA_SELFHOSTED_API_BASE,
                search_path=JIRA_SELFHOSTED_SEARCH_PATH,
            ),
            jira_update_mapping("OPS-9", base=JIRA_SELFHOSTED_API_BASE),
            jira_transitions_mapping(
                "OPS-9",
                [
                    {"id": "11", "name": "To Do", "to": {"statusCategory": {"key": "new"}}},
                    {"id": "41", "name": "Done", "to": {"statusCategory": {"key": "done"}}},
                ],
                base=JIRA_SELFHOSTED_API_BASE,
            ),
            jira_transition_post_mapping("OPS-9", base=JIRA_SELFHOSTED_API_BASE),
            jira_comment_mapping("OPS-9", base=JIRA_SELFHOSTED_API_BASE),
        ],
    )

    receiver = update_raw_channel_config(jira_selfhosted_config(), str(uuid.uuid4()), notification_channel)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
        json=receiver,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"

    assert len(find_requests(notification_channel, "PUT", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-9")) == 1
    assert len(find_requests(notification_channel, "GET", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-9/transitions")) == 1

    transitions = find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-9/transitions")
    assert len(transitions) == 1
    assert json.loads(base64.b64decode(transitions[0]["bodyAsBase64"]).decode("utf-8")) == {"transition": {"id": "11"}}

    comments = find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue/OPS-9/comment")
    assert len(comments) == 1
    assert len(find_requests(notification_channel, "POST", f"{JIRA_SELFHOSTED_API_BASE}/issue")) == 0
