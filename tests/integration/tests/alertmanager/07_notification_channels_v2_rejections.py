import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
)

TIMEOUT = 10

V2_BASE_URL = "/api/v2/notification_channels"


@pytest.mark.parametrize(
    "clashing_field,message_fragment",
    [
        pytest.param("name", "with name", id="name"),
        pytest.param("displayName", "with display name", id="display_name"),
    ],
)
def test_create_rejects_a_duplicate_with_conflict(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    clashing_field: str,
    message_fragment: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    shared = f"v2-dup-{uuid.uuid4().hex[:8]}"

    first = {"name": f"{shared}-first", "displayName": f"{shared} first", "config": {"kind": "email", "spec": {"to": "first@integration.test", "html": "<p>body</p>"}}}
    first[clashing_field] = shared
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=first,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    cleanup_notification_channels.append(response.json()["data"]["id"])

    second = {"name": f"{shared}-second", "displayName": f"{shared} second", "config": {"kind": "email", "spec": {"to": "second@integration.test", "html": "<p>body</p>"}}}
    second[clashing_field] = shared
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=second,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CONFLICT, response.text
    # Both v2 conflicts share a status and an error code, so only the message
    # separates a clashing display name from a clashing name.
    assert message_fragment in response.text


@pytest.mark.parametrize(
    "body",
    [
        pytest.param(
            {
                "name": "Not_A_Label",
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
            },
            id="name_not_dns1123_label",
        ),
        pytest.param(
            {"config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}},
            id="no_name_and_no_generate_name",
        ),
        pytest.param(
            {
                "name": "explicit",
                "generateName": True,
                "displayName": "Explicit",
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
            },
            id="name_with_generate_name",
        ),
        pytest.param(
            {
                "generateName": True,
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
            },
            id="generate_name_without_display_name",
        ),
        pytest.param(
            {
                "name": "default-receiver",
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
            },
            id="reserved_receiver_name",
        ),
        pytest.param({"name": "rejected"}, id="no_config"),
        pytest.param(
            {"name": "rejected", "config": {"kind": "telegram", "spec": {"chatId": 1}}},
            id="unmodelled_kind",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {
                        "apiUrl": "https://hooks.slack.test/services/T/B/X",
                        "channel": "#a",
                        "text": "body",
                        "iconEmoji": ":tada:",
                    },
                },
            },
            id="unknown_spec_field",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "slack", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
            },
            id="spec_of_another_kind",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "slack", "spec": {"channel": "#alerts", "title": "Alert", "text": "body"}},
            },
            id="slack_without_api_url",
        ),
        pytest.param(
            {"name": "rejected", "config": {"kind": "email", "spec": {"html": "<p>body</p>"}}},
            id="email_without_to",
        ),
        pytest.param(
            {"name": "rejected", "config": {"kind": "webhook", "spec": {}}},
            id="webhook_without_url",
        ),
        pytest.param(
            {"name": "rejected", "config": {"kind": "pagerduty", "spec": {"description": "body"}}},
            id="pagerduty_without_routing_key",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "opsgenie", "spec": {"message": "subject", "description": "body"}},
            },
            id="opsgenie_without_api_key",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "msteams", "spec": {"title": "Alert", "text": "body"}},
            },
            id="msteams_without_webhook_url",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "googlechat", "spec": {"title": "Alert", "text": "body"}},
            },
            id="googlechat_without_webhook_url",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "project": "OPS",
                        "issueType": "Bug",
                        "email": "oncall@integration.test",
                        "apiToken": "jira-api-token",
                    },
                },
            },
            id="jira_without_site",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "issueType": "Bug",
                        "email": "oncall@integration.test",
                        "apiToken": "jira-api-token",
                    },
                },
            },
            id="jira_without_project",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "project": "OPS",
                        "email": "oncall@integration.test",
                        "apiToken": "jira-api-token",
                    },
                },
            },
            id="jira_without_issue_type",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "project": "OPS",
                        "issueType": "Bug",
                        "apiToken": "jira-api-token",
                    },
                },
            },
            id="jira_without_email",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "project": "OPS",
                        "issueType": "Bug",
                        "email": "oncall@integration.test",
                    },
                },
            },
            id="jira_without_api_token",
        ),
        pytest.param(
            {"name": "rejected", "config": {"kind": "jsmops", "spec": {}}},
            id="jsmops_without_api_key",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "incidentio", "spec": {"token": "incidentio-token"}},
            },
            id="incidentio_without_url",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "incidentio",
                    "spec": {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF"},
                },
            },
            id="incidentio_without_token",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "fields": [{"title": "Severity"}]},
                },
            },
            id="slack_field_without_value",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {
                        "apiUrl": "https://hooks.slack.test/services/T/B/X",
                        "actions": [{"type": "button", "url": "https://signoz.test"}],
                    },
                },
            },
            id="slack_action_without_text",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {
                        "apiUrl": "https://hooks.slack.test/services/T/B/X",
                        "actions": [{"type": "button", "text": "Open"}],
                    },
                },
            },
            id="slack_action_without_url_or_name",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {
                        "apiUrl": "https://hooks.slack.test/services/T/B/X",
                        "actions": [{"type": "button", "text": "Ack", "name": "ack", "confirm": {"title": "Sure?"}}],
                    },
                },
            },
            id="slack_action_confirm_without_text",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}},
                "type": "this key is not a valid",
            },
            id="unknown_envelope_field",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "webhook",
                    "spec": {"url": "https://webhook.test/hook", "username": "u", "password": "p", "bearerToken": "t"},
                },
            },
            id="webhook_basic_auth_with_bearer_token",
        ),
        # The next three break a rule of the notifier rather than of the request
        # shape, and still surface as a 400.
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://jira.acme.com",
                        "project": "OPS",
                        "issueType": "Bug",
                        "email": "a@integration.test",
                        "apiToken": "t",
                        "summary": "Alert",
                        "description": "body",
                    },
                },
            },
            id="jira_site_not_jira_cloud",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "project": "OPS",
                        "issueType": "Bug",
                        "email": "a@integration.test",
                        "apiToken": "t",
                        "summary": "Alert",
                        "description": "body",
                        "reopenDuration": "30s",
                    },
                },
            },
            id="jira_reopen_duration_below_a_minute",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "incidentio",
                    "spec": {
                        "url": "https://api.incident.io/v2/alert_events/http/01ABCDEF",
                        "token": "Bearer incidentio-token",
                        "title": "Alert",
                        "description": "body",
                    },
                },
            },
            id="incidentio_token_with_bearer_prefix",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "slack",
                    "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "title": ""},
                },
            },
            id="slack_title_empty_instead_of_omitted",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "jsmops", "spec": {"apiKey": "jsm-api-key", "tags": ""}},
            },
            id="jsmops_tags_empty_instead_of_omitted",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {
                    "kind": "jira",
                    "spec": {
                        "site": "https://acme.atlassian.net",
                        "project": "OPS",
                        "issueType": "Bug",
                        "email": "a@integration.test",
                        "apiToken": "t",
                        "reopenDuration": "72h",
                    },
                },
            },
            id="jira_reopen_duration_not_as_reported",
        ),
        pytest.param(
            {
                "name": "rejected",
                "config": {"kind": "email", "spec": {"to": "a@integration.test", "headers": {"subject": "must be written in canonical form, Subject"}}},
            },
            id="email_header_name_not_canonical",
        ),
    ],
)
def test_create_rejects_invalid_bodies(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    body: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


@pytest.mark.parametrize(
    "params",
    [
        pytest.param({"sort": "data"}, id="sort_outside_the_enum"),
        pytest.param({"order": "sideways"}, id="order_outside_the_enum"),
        pytest.param({"kind": "telegram"}, id="kind_outside_the_enum"),
        pytest.param({"limit": -1}, id="negative_limit"),
        pytest.param({"offset": -1}, id="negative_offset"),
    ],
)
def test_list_rejects_invalid_params(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    params: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params=params,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_get_unknown_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/0199a1b2-c3d4-7000-8000-000000000000"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


@pytest.mark.parametrize(
    "body",
    [
        pytest.param(
            {
                "name": "renamed",
                "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}},
            },
            id="name_in_body",
        ),
        pytest.param(
            {
                "displayName": "Renamed",
                "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}},
            },
            id="display_name_in_body",
        ),
        pytest.param(
            {"config": {"kind": "slack", "spec": {}}},
            id="spec_missing_required_field",
        ),
        pytest.param({}, id="no_config"),
    ],
)
def test_update_rejects_invalid_bodies(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    body: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-badupdate-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


@pytest.mark.parametrize(
    "body",
    [
        pytest.param(
            {
                "name": "test-send",
                "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}},
            },
            id="name_in_body",
        ),
        pytest.param(
            {"config": {"kind": "slack", "spec": {}}},
            id="spec_missing_required_field",
        ),
        pytest.param(
            {"config": {"kind": "telegram", "spec": {"chatId": 1}}},
            id="unmodelled_kind",
        ),
        pytest.param({}, id="no_config"),
    ],
)
def test_test_rejects_invalid_bodies(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    body: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/test"),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
