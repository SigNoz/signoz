import re
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

DNS1123_LABEL = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")

_EDITOR_EMAIL = "editor+channelsv2@integration.test"
_VIEWER_EMAIL = "viewer+channelsv2@integration.test"
_PASSWORD = "password123Z$"


@pytest.mark.parametrize(
    "kind,spec,assert_field,assert_value",
    [
        pytest.param("slack", {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts", "title": "Alert", "text": "{{ .CommonLabels.alertname }}"}, "channel", "#alerts", id="slack"),
        pytest.param("email", {"to": "oncall@integration.test", "html": "<p>{{ .CommonLabels.alertname }}</p>"}, "to", "oncall@integration.test", id="email"),
        pytest.param("webhook", {"url": "https://webhook.test/hook", "username": "bob", "password": "s3cret"}, "username", "bob", id="webhook"),
        pytest.param("pagerduty", {"routingKey": "pd-routing-key", "severity": "critical", "class": "db", "description": "{{ .CommonLabels.alertname }}"}, "severity", "critical", id="pagerduty"),
        pytest.param("opsgenie", {"apiKey": "og-api-key", "message": "{{ .CommonLabels.alertname }}", "description": "{{ .CommonLabels.alertname }}", "priority": "P2"}, "priority", "P2", id="opsgenie"),
        pytest.param("msteams", {"webhookUrl": "https://teams.test/webhook/abc", "title": "Alert", "text": "{{ .CommonLabels.alertname }}"}, "title", "Alert", id="msteams"),
        # The google chat notifier only accepts https URLs on chat.googleapis.com.
        pytest.param("googlechat", {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t", "title": "Alert", "text": "{{ .CommonLabels.alertname }}"}, "title", "Alert", id="googlechat"),
        # The jira notifier only accepts Jira Cloud sites and basic auth.
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "oncall@integration.test", "apiToken": "jira-api-token", "summary": "Alert", "description": "{{ .CommonLabels.alertname }}", "customFields": {"customfield_10010": "Ops"}}, "project", "OPS", id="jira"),
        pytest.param("jsmops", {"apiKey": "jsm-api-key", "message": "Alert", "description": "{{ .CommonLabels.alertname }}", "priority": "P2"}, "priority", "P2", id="jsmops"),
        # The incident.io notifier only accepts an alert source's events URL.
        pytest.param("incidentio", {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF", "token": "incidentio-token", "title": "Alert", "description": "{{ .CommonLabels.alertname }}"}, "title", "Alert", id="incidentio"),
    ],
)
def test_create_returns_the_channel_for_every_kind(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    kind: str,
    spec: dict,
    assert_field: str,
    assert_value: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-{kind}-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "displayName": f"Display {name}", "config": {"kind": kind, "spec": spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["name"] == name
    assert created["displayName"] == f"Display {name}"
    assert created["config"]["kind"] == kind
    assert created["config"]["spec"][assert_field] == assert_value
    assert created["createdAt"]
    assert created["updatedAt"]


@pytest.mark.parametrize(
    "kind,spec,expected_send_resolved",
    [
        pytest.param("slack", {"apiUrl": "https://hooks.slack.test/services/T/B/X", "title": "Alert", "text": "body"}, False, id="slack"),
        pytest.param("email", {"to": "oncall@integration.test", "html": "<p>body</p>"}, False, id="email"),
        pytest.param("webhook", {"url": "https://webhook.test/hook"}, True, id="webhook"),
        pytest.param("pagerduty", {"routingKey": "pd-routing-key", "description": "body"}, True, id="pagerduty"),
        pytest.param("opsgenie", {"apiKey": "og-api-key", "message": "subject", "description": "body", "priority": "P2"}, True, id="opsgenie"),
        pytest.param("msteams", {"webhookUrl": "https://teams.test/webhook/abc", "title": "Alert", "text": "body"}, True, id="msteams"),
        pytest.param("googlechat", {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t", "title": "Alert", "text": "body"}, False, id="googlechat"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "oncall@integration.test", "apiToken": "jira-api-token", "summary": "Alert", "description": "body"}, False, id="jira"),
        pytest.param("jsmops", {"apiKey": "jsm-api-key", "message": "Alert", "description": "body"}, False, id="jsmops"),
        pytest.param("incidentio", {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF", "token": "incidentio-token", "title": "Alert", "description": "body"}, False, id="incidentio"),
    ],
)
def test_create_without_send_resolved_returns_the_notifier_default(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    kind: str,
    spec: dict,
    expected_send_resolved: bool,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-sendresolved-{kind}-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": kind, "spec": spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["config"]["spec"]["sendResolved"] is expected_send_resolved


@pytest.mark.parametrize(
    "kind,spec,template_fields",
    [
        pytest.param("slack", {"apiUrl": "https://hooks.slack.test/services/T/B/X"}, ["title", "text"], id="slack"),
        pytest.param("email", {"to": "oncall@integration.test"}, ["html"], id="email"),
        pytest.param("pagerduty", {"routingKey": "pd-routing-key"}, ["description"], id="pagerduty"),
        pytest.param("opsgenie", {"apiKey": "og-api-key"}, ["message", "description"], id="opsgenie"),
        pytest.param("msteams", {"webhookUrl": "https://teams.test/webhook/abc"}, ["title", "text"], id="msteams"),
        pytest.param("googlechat", {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t"}, ["title", "text"], id="googlechat"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "oncall@integration.test", "apiToken": "jira-api-token"}, ["summary", "description"], id="jira"),
        pytest.param("jsmops", {"apiKey": "jsm-api-key"}, ["message", "description"], id="jsmops"),
        pytest.param("incidentio", {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF", "token": "incidentio-token"}, ["title", "description"], id="incidentio"),
    ],
)
def test_create_without_templates_returns_the_notifier_defaults(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    kind: str,
    spec: dict,
    template_fields: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-templates-{kind}-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": kind, "spec": spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    for field in template_fields:
        assert "{{" in created["config"]["spec"][field], f"{field} should come back carrying the notifier's default template"


def test_create_defaults_display_name_to_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-nodisplay-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": "email", "spec": {"to": "nodisplay@integration.test", "html": "<p>body</p>"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["name"] == name
    assert created["displayName"] == name


def test_create_with_generate_name_derives_a_dns1123_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    display_name = f"On Call Escalation {uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={
            "generateName": True,
            "displayName": display_name,
            "config": {"kind": "email", "spec": {"to": "generated@integration.test", "html": "<p>body</p>"}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["displayName"] == display_name
    assert DNS1123_LABEL.match(created["name"]), created["name"]
    assert created["name"].startswith("on-call-escalation-")
    assert created["name"] != display_name


def test_create_generates_a_distinct_name_for_the_same_display_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    display_name = f"Duplicate Display {uuid.uuid4().hex[:8]}"
    names = []

    for suffix in ("a", "b"):
        response = requests.post(
            signoz.self.host_configs["8080"].get(V2_BASE_URL),
            json={
                "generateName": True,
                # The display name has to differ, because it is still the
                # receiver name in the alertmanager config and must be unique.
                "displayName": f"{display_name} {suffix}",
                "config": {"kind": "email", "spec": {"to": f"{suffix}@integration.test", "html": "<p>body</p>"}},
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text
        created = response.json()["data"]
        cleanup_notification_channels.append(created["id"])
        names.append(created["name"])

    assert names[0] != names[1]


def test_create_rejects_a_duplicate_name_with_conflict(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-dupname-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "displayName": f"{name} first", "config": {"kind": "email", "spec": {"to": "first@integration.test", "html": "<p>body</p>"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    cleanup_notification_channels.append(response.json()["data"]["id"])

    # Same name, different display name: only the unique index on
    # (org_id, name) can catch this one.
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "displayName": f"{name} second", "config": {"kind": "email", "spec": {"to": "second@integration.test", "html": "<p>body</p>"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CONFLICT, response.text


def test_create_rejects_a_duplicate_display_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    display_name = f"v2-dupdisplay-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": f"{display_name}-one", "displayName": display_name, "config": {"kind": "email", "spec": {"to": "one@integration.test", "html": "<p>body</p>"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    cleanup_notification_channels.append(response.json()["data"]["id"])

    # The display name is the receiver name in the alertmanager config, which
    # rejects duplicates before the row is ever written.
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": f"{display_name}-two", "displayName": display_name, "config": {"kind": "email", "spec": {"to": "two@integration.test", "html": "<p>body</p>"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CONFLICT, response.text
    # Both v2 conflicts share a status and an error code, so only the message
    # separates a clashing display name from a clashing name.
    assert "display name" in response.text


@pytest.mark.parametrize(
    "body",
    [
        pytest.param({"name": "Not_A_Label", "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="name_not_dns1123_label"),
        pytest.param({"config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="no_name_and_no_generate_name"),
        pytest.param({"name": "explicit", "generateName": True, "displayName": "Explicit", "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="name_with_generate_name"),
        pytest.param({"generateName": True, "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="generate_name_without_display_name"),
        pytest.param({"name": "default-receiver", "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="reserved_receiver_name"),
        pytest.param({"name": "no-config"}, id="no_config"),
        pytest.param({"name": "telegram-kind", "config": {"kind": "telegram", "spec": {"chatId": 1}}}, id="unmodelled_kind"),
        pytest.param({"name": "slack-unknown-field", "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#a", "text": "body", "iconEmoji": ":tada:"}}}, id="unknown_spec_field"),
        pytest.param({"name": "slack-with-email-spec", "config": {"kind": "slack", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}}, id="spec_of_another_kind"),
        pytest.param({"name": "extra-field", "config": {"kind": "email", "spec": {"to": "a@integration.test", "html": "<p>body</p>"}}, "type": "email"}, id="unknown_envelope_field"),
        pytest.param({"name": "webhook-both-auth", "config": {"kind": "webhook", "spec": {"url": "https://webhook.test/hook", "username": "u", "password": "p", "bearerToken": "t"}}}, id="webhook_basic_auth_with_bearer_token"),
        pytest.param({"name": "webhook-half-auth", "config": {"kind": "webhook", "spec": {"url": "https://webhook.test/hook", "username": "u"}}}, id="webhook_basic_auth_without_password"),
        # The last three reach the notifier's own validation rather than the
        # spec's, so they assert it still surfaces as a 400 through v2.
        pytest.param({"name": "jira-server-site", "config": {"kind": "jira", "spec": {"site": "https://jira.acme.com", "project": "OPS", "issueType": "Bug", "email": "a@integration.test", "apiToken": "t", "summary": "Alert", "description": "body"}}}, id="jira_site_not_jira_cloud"),
        pytest.param(
            {"name": "jira-short-reopen", "config": {"kind": "jira", "spec": {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "a@integration.test", "apiToken": "t", "summary": "Alert", "description": "body", "reopenDuration": "30s"}}}, id="jira_reopen_duration_below_a_minute"
        ),
        pytest.param({"name": "incidentio-bearer", "config": {"kind": "incidentio", "spec": {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF", "token": "Bearer incidentio-token", "title": "Alert", "description": "body"}}}, id="incidentio_token_with_bearer_prefix"),
        pytest.param({"name": "slack-empty-title", "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "title": ""}}}, id="empty_string_on_a_defaulted_field"),
        pytest.param({"name": "jsmops-empty-tags", "config": {"kind": "jsmops", "spec": {"apiKey": "jsm-api-key", "tags": ""}}}, id="empty_string_on_a_defaulted_signoz_field"),
        pytest.param({"name": "jira-noncanonical-reopen", "config": {"kind": "jira", "spec": {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "a@integration.test", "apiToken": "t", "reopenDuration": "72h"}}}, id="jira_reopen_duration_not_as_reported"),
        pytest.param({"name": "email-lowercase-header", "config": {"kind": "email", "spec": {"to": "a@integration.test", "headers": {"subject": "Alert"}}}}, id="email_header_name_not_as_reported"),
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
    "kind,spec",
    [
        pytest.param("slack", {"channel": "#alerts", "title": "Alert", "text": "body"}, id="slack_without_api_url"),
        pytest.param("email", {"html": "<p>body</p>"}, id="email_without_to"),
        pytest.param("webhook", {}, id="webhook_without_url"),
        pytest.param("pagerduty", {"description": "body"}, id="pagerduty_without_routing_key"),
        pytest.param("opsgenie", {"message": "subject", "description": "body"}, id="opsgenie_without_api_key"),
        pytest.param("msteams", {"title": "Alert", "text": "body"}, id="msteams_without_webhook_url"),
        pytest.param("googlechat", {"title": "Alert", "text": "body"}, id="googlechat_without_webhook_url"),
        pytest.param("jira", {"project": "OPS", "issueType": "Bug", "email": "oncall@integration.test", "apiToken": "jira-api-token"}, id="jira_without_site"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "issueType": "Bug", "email": "oncall@integration.test", "apiToken": "jira-api-token"}, id="jira_without_project"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "email": "oncall@integration.test", "apiToken": "jira-api-token"}, id="jira_without_issue_type"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "apiToken": "jira-api-token"}, id="jira_without_email"),
        pytest.param("jira", {"site": "https://acme.atlassian.net", "project": "OPS", "issueType": "Bug", "email": "oncall@integration.test"}, id="jira_without_api_token"),
        pytest.param("jsmops", {}, id="jsmops_without_api_key"),
        pytest.param("incidentio", {"token": "incidentio-token"}, id="incidentio_without_url"),
        pytest.param("incidentio", {"url": "https://api.incident.io/v2/alert_events/http/01ABCDEF"}, id="incidentio_without_token"),
    ],
)
def test_create_rejects_a_spec_missing_a_required_field(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    kind: str,
    spec: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": f"v2-missing-{uuid.uuid4().hex[:8]}", "config": {"kind": kind, "spec": spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_create_accepts_an_opsgenie_channel_without_a_priority(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Nothing seeds priority, so v1 channels created without one hold an empty
    # value; requiring it here would make those rows unsaveable through v2.
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={
            "name": f"v2-og-nopriority-{uuid.uuid4().hex[:8]}",
            "config": {"kind": "opsgenie", "spec": {"apiKey": "og-api-key", "message": "subject", "description": "body"}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["config"]["spec"]["priority"] == ""


def test_create_echoes_an_empty_value_on_a_field_with_no_default(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={
            "name": f"v2-pd-empty-{uuid.uuid4().hex[:8]}",
            "config": {"kind": "pagerduty", "spec": {"routingKey": "pd-routing-key", "severity": "", "class": ""}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    assert created["config"]["spec"]["severity"] == ""
    assert created["config"]["spec"]["class"] == ""


def test_notification_channel_v2_lifecycle(  # pylint: disable=too-many-statements
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token_hex = uuid.uuid4().hex[:8]

    # ── stage 1: create one channel per kind, oldest first ───────────────────
    ids: dict[str, str] = {}
    for label, display_name, kind, spec in [
        ("alpha", f"Alpha Overview {token_hex}", "slack", {"apiUrl": "https://hooks.slack.test/services/T/B/SECRET", "channel": "#alerts"}),
        ("beta", f"Beta Escalation {token_hex}", "msteams", {"webhookUrl": "https://teams.test/webhook/abc"}),
        ("gamma", f"Gamma Overview {token_hex}", "webhook", {"url": "https://webhook.test/hook"}),
    ]:
        response = requests.post(
            signoz.self.host_configs["8080"].get(V2_BASE_URL),
            json={"name": f"v2-list-{label}-{token_hex}", "displayName": display_name, "config": {"kind": kind, "spec": spec}},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text
        ids[label] = response.json()["data"]["id"]
        cleanup_notification_channels.append(ids[label])

    # ── stage 2: list ─────────────────────────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    listed = response.json()["data"]
    assert listed["total"] == 3
    assert {channel["kind"] for channel in listed["channels"]} == {"slack", "msteams", "webhook"}
    assert all("config" not in channel for channel in listed["channels"])
    assert "SECRET" not in response.text
    assert [channel["displayName"] for channel in listed["channels"]] == [
        f"Gamma Overview {token_hex}",
        f"Beta Escalation {token_hex}",
        f"Alpha Overview {token_hex}",
    ]

    # ── stage 3: update ──────────────────────────────────────────────────────
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids['alpha']}"),
        json={"config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/Z", "channel": "#incidents"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    updated = response.json()["data"]
    assert updated["name"] == f"v2-list-alpha-{token_hex}"
    assert updated["displayName"] == f"Alpha Overview {token_hex}"
    assert updated["config"]["spec"]["channel"] == "#incidents"

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [channel["displayName"] for channel in response.json()["data"]["channels"]] == [
        f"Alpha Overview {token_hex}",
        f"Gamma Overview {token_hex}",
        f"Beta Escalation {token_hex}",
    ]

    # ── stage 4: search by display name ───────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": f"overview {token_hex}"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    listed = response.json()["data"]
    assert listed["total"] == 2
    assert {channel["displayName"] for channel in listed["channels"]} == {f"Alpha Overview {token_hex}", f"Gamma Overview {token_hex}"}

    # ── stage 5: filter by kind ───────────────────────────────────────────────
    # msteams is stored as msteamsv2, so the filter has to translate the api kind
    # rather than match Channel.Type directly.
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex, "kind": "msteams"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    listed = response.json()["data"]
    assert listed["total"] == 1
    assert listed["channels"][0]["kind"] == "msteams"

    # ── stage 6: page ─────────────────────────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex, "limit": 2},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    listed = response.json()["data"]
    assert listed["total"] == 3
    assert len(listed["channels"]) == 2

    # ── stage 7: page past the last match ─────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex, "offset": 10},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    listed = response.json()["data"]
    assert listed["channels"] == []
    assert listed["total"] == 3

    # ── stage 8: get by id ────────────────────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids['alpha']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    fetched = response.json()["data"]
    assert fetched["name"] == f"v2-list-alpha-{token_hex}"
    assert fetched["displayName"] == f"Alpha Overview {token_hex}"
    assert fetched["config"]["spec"]["apiUrl"] == "https://hooks.slack.test/services/T/B/Z"
    assert fetched["config"]["spec"]["channel"] == "#incidents"

    # ── stage 9: update the kind ──────────────────────────────────────────────
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids['beta']}"),
        json={"config": {"kind": "webhook", "spec": {"url": "https://webhook.test/hook"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["kind"] == "webhook"

    # ── stage 10: delete ──────────────────────────────────────────────────────
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids['gamma']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text
    cleanup_notification_channels.remove(ids["gamma"])

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids['gamma']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": token_hex},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 2


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
        pytest.param({"name": "renamed", "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}}}, id="name_in_body"),
        pytest.param({"displayName": "Renamed", "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}}}, id="display_name_in_body"),
        pytest.param({"config": {"kind": "slack", "spec": {}}}, id="spec_missing_required_field"),
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
        pytest.param({"name": "test-send", "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}}}, id="name_in_body"),
        pytest.param({"config": {"kind": "slack", "spec": {}}}, id="spec_missing_required_field"),
        pytest.param({"config": {"kind": "telegram", "spec": {"chatId": 1}}}, id="unmodelled_kind"),
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
