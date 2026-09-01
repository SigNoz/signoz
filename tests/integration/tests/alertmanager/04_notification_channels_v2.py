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
    create_active_user,
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
    # (org_id, internal_name) can catch this one.
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
        pytest.param("slack", {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts", "text": "body"}, id="slack_without_title"),
        pytest.param("slack", {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts", "title": "Alert"}, id="slack_without_text"),
        pytest.param("email", {"html": "<p>body</p>"}, id="email_without_to"),
        pytest.param("email", {"to": "a@integration.test"}, id="email_without_html"),
        pytest.param("webhook", {}, id="webhook_without_url"),
        pytest.param("pagerduty", {"description": "body"}, id="pagerduty_without_routing_key"),
        pytest.param("pagerduty", {"routingKey": "pd-routing-key"}, id="pagerduty_without_description"),
        pytest.param("opsgenie", {"message": "subject", "description": "body"}, id="opsgenie_without_api_key"),
        pytest.param("opsgenie", {"apiKey": "og-api-key", "description": "body"}, id="opsgenie_without_message"),
        pytest.param("opsgenie", {"apiKey": "og-api-key", "message": "subject"}, id="opsgenie_without_description"),
        pytest.param("msteams", {"title": "Alert", "text": "body"}, id="msteams_without_webhook_url"),
        pytest.param("msteams", {"webhookUrl": "https://teams.test/webhook/abc", "text": "body"}, id="msteams_without_title"),
        pytest.param("msteams", {"webhookUrl": "https://teams.test/webhook/abc", "title": "Alert"}, id="msteams_without_text"),
        pytest.param("googlechat", {"title": "Alert", "text": "body"}, id="googlechat_without_webhook_url"),
        pytest.param("googlechat", {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t", "text": "body"}, id="googlechat_without_title"),
        pytest.param("googlechat", {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t", "title": "Alert"}, id="googlechat_without_text"),
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

    assert "priority" not in created["config"]["spec"]


def test_setup_managed_role_users(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # A rerun against a --reuse stack starts from the previous run's state, and
    # inviting an existing address fails, so only invite what is missing.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_emails = {user["email"] for user in response.json()["data"]}

    for email, role, name in (
        (_EDITOR_EMAIL, "signoz-editor", "channels v2 editor"),
        (_VIEWER_EMAIL, "signoz-viewer", "channels v2 viewer"),
    ):
        if email not in existing_emails:
            create_active_user(signoz, admin_token, email=email, role=role, password=_PASSWORD, name=name)


@pytest.mark.parametrize("email", [_EDITOR_EMAIL, _VIEWER_EMAIL], ids=["editor", "viewer"])
def test_create_is_forbidden_below_admin(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    email: str,
) -> None:
    token = get_token(email, _PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={
            "name": f"v2-forbidden-{uuid.uuid4().hex[:8]}",
            "config": {"kind": "email", "spec": {"to": "forbidden@integration.test", "html": "<p>body</p>"}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
