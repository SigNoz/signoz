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


@pytest.mark.parametrize(
    "kind,request_spec",
    [
        pytest.param(
            "slack",
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "channel": "#alerts",
                "title": "Alert",
                "text": "{{ .CommonLabels.alertname }}",
            },
            id="slack",
        ),
        pytest.param(
            "slack",
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "channel": "#alerts",
                "color": "#439FE0",
                "titleLink": "{{ .CommonLabels.ruleSource }}",
                "footer": "platform · terraform",
                "fields": [{"title": "Severity", "value": "{{ .CommonLabels.severity }}", "short": True}],
                "actions": [{"type": "button", "text": "Open in SigNoz", "url": "{{ .CommonLabels.ruleSource }}", "style": "primary", "name": "open", "value": "signoz"}],
            },
            id="slack_with_fields_and_actions",
        ),
        pytest.param(
            "slack",
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "channel": "",
                "fields": [],
                "actions": [],
            },
            id="slack_with_empty_values",
        ),
        pytest.param(
            "email",
            {
                "to": "oncall@integration.test",
                "html": "<p>{{ .CommonLabels.alertname }}</p>",
            },
            id="email",
        ),
        pytest.param(
            "email",
            {
                "to": "oncall@integration.test",
                "headers": {},
            },
            id="email_with_empty_headers",
        ),
        pytest.param(
            "webhook",
            {
                "url": "https://webhook.test/hook",
                "username": "bob",
                "password": "s3cret",
            },
            id="webhook",
        ),
        pytest.param(
            "webhook",
            {
                "url": "https://webhook.test/hook",
                "username": "",
                "password": "",
                "bearerToken": "",
            },
            id="webhook_with_empty_auth",
        ),
        pytest.param(
            "pagerduty",
            {
                "routingKey": "pd-routing-key",
                "severity": "critical",
                "class": "db",
                "description": "{{ .CommonLabels.alertname }}",
            },
            id="pagerduty",
        ),
        pytest.param(
            "pagerduty",
            {
                "routingKey": "pd-routing-key",
                "url": "",
                "severity": "",
                "component": "",
                "group": "",
                "class": "",
                "details": {},
            },
            id="pagerduty_with_empty_values",
        ),
        # A sent map reads back as sent, without the default entries.
        pytest.param(
            "pagerduty",
            {
                "routingKey": "pd-routing-key",
                "details": {"env": "prod", "team": "platform"},
            },
            id="pagerduty_with_details",
        ),
        pytest.param(
            "opsgenie",
            {
                "apiKey": "og-api-key",
                "message": "{{ .CommonLabels.alertname }}",
                "description": "{{ .CommonLabels.alertname }}",
                "priority": "P2",
            },
            id="opsgenie",
        ),
        pytest.param(
            "opsgenie",
            {
                "apiKey": "og-api-key",
                "apiUrl": "",
                "priority": "",
                "details": {},
            },
            id="opsgenie_with_empty_values",
        ),
        pytest.param(
            "msteams",
            {
                "webhookUrl": "https://teams.test/webhook/abc",
                "title": "Alert",
                "text": "{{ .CommonLabels.alertname }}",
            },
            id="msteams",
        ),
        # The google chat notifier only accepts https URLs on chat.googleapis.com.
        pytest.param(
            "googlechat",
            {
                "webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t",
                "title": "Alert",
                "text": "{{ .CommonLabels.alertname }}",
            },
            id="googlechat",
        ),
        # The jira notifier only accepts Jira Cloud sites and basic auth.
        pytest.param(
            "jira",
            {
                "site": "https://acme.atlassian.net",
                "project": "OPS",
                "issueType": "Bug",
                "email": "oncall@integration.test",
                "apiToken": "jira-api-token",
                "summary": "Alert",
                "description": "{{ .CommonLabels.alertname }}",
                "customFields": {"customfield_10010": "Ops"},
            },
            id="jira",
        ),
        pytest.param(
            "jira",
            {
                "site": "https://acme.atlassian.net",
                "project": "OPS",
                "issueType": "Bug",
                "email": "oncall@integration.test",
                "apiToken": "jira-api-token",
                "priority": "",
                "labels": [],
                "resolveTransition": "",
                "reopenTransition": "",
                "wontFixResolution": "",
                "customFields": {},
            },
            id="jira_with_empty_values",
        ),
        pytest.param(
            "jsmops",
            {
                "apiKey": "jsm-api-key",
                "message": "Alert",
                "description": "{{ .CommonLabels.alertname }}",
                "priority": "P2",
            },
            id="jsmops",
        ),
        pytest.param(
            "jsmops",
            {
                "apiKey": "jsm-api-key",
                "priority": "",
            },
            id="jsmops_with_empty_priority",
        ),
        # The incident.io notifier only accepts an alert source's events URL.
        pytest.param(
            "incidentio",
            {
                "url": "https://api.incident.io/v2/alert_events/http/01ABCDEF",
                "token": "incidentio-token",
                "title": "Alert",
                "description": "{{ .CommonLabels.alertname }}",
            },
            id="incidentio",
        ),
        pytest.param(
            "incidentio",
            {
                "url": "https://api.incident.io/v2/alert_events/http/01ABCDEF",
                "token": "incidentio-token",
                "metadata": {},
            },
            id="incidentio_with_empty_metadata",
        ),
    ],
)
def test_create_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    kind: str,
    request_spec: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-{kind}-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": kind, "spec": request_spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{created['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    fetched = response.json()["data"]

    assert created["name"] == name
    assert created["displayName"] == name
    assert created["config"]["kind"] == kind
    assert created["createdAt"]
    assert created["updatedAt"]

    ## ensure that every field in the request is a part of the responses.
    for spec_read in (created["config"]["spec"], fetched["config"]["spec"]):
        for field, value in request_spec.items():
            assert spec_read[field] == value, field


@pytest.mark.parametrize(
    "kind,request_spec,expected_defaults,fields_without_default,fields_read_as_null",
    [
        pytest.param(
            "slack",
            {"apiUrl": "https://hooks.slack.test/services/T/B/X"},
            {
                "sendResolved": False,
                "title": '{{ template "slack.default.title" . }}',
                "text": '{{ template "slack.default.text" . }}',
                "color": '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}',
                "titleLink": '{{ template "slack.default.titlelink" . }}',
                "pretext": '{{ template "slack.default.pretext" . }}',
                "fallback": '{{ template "slack.default.fallback" . }}',
                "footer": '{{ template "slack.default.footer" . }}',
            },
            ["channel"],
            ["fields", "actions"],
            id="slack",
        ),
        pytest.param(
            "email",
            {"to": "oncall@integration.test"},
            {
                "sendResolved": False,
                "html": '{{ template "email.default.html" . }}',
            },
            [],
            ["headers"],
            id="email",
        ),
        pytest.param(
            "webhook",
            {"url": "https://webhook.test/hook"},
            {
                "sendResolved": True,
            },
            ["username", "password", "bearerToken"],
            [],
            id="webhook",
        ),
        pytest.param(
            "pagerduty",
            {"routingKey": "pd-routing-key"},
            {
                "sendResolved": True,
                "source": '{{ template "pagerduty.default.client" . }}',
                "client": '{{ template "pagerduty.default.client" . }}',
                "clientUrl": '{{ template "pagerduty.default.clientURL" . }}',
                "description": '{{ template "pagerduty.default.description" .}}',
                "details": {
                    "firing": "{{ .Alerts.Firing | toJson }}",
                    "num_firing": "{{ .Alerts.Firing | len }}",
                    "num_resolved": "{{ .Alerts.Resolved | len }}",
                    "resolved": "{{ .Alerts.Resolved | toJson }}",
                },
            },
            ["url", "severity", "component", "group", "class"],
            [],
            id="pagerduty",
        ),
        pytest.param(
            "opsgenie",
            {"apiKey": "og-api-key"},
            {
                "sendResolved": True,
                "message": '{{ template "opsgenie.default.message" . }}',
                "description": '{{ template "opsgenie.default.description" . }}',
                "source": '{{ template "opsgenie.default.source" . }}',
            },
            ["apiUrl", "priority"],
            ["details"],
            id="opsgenie",
        ),
        pytest.param(
            "msteams",
            {"webhookUrl": "https://teams.test/webhook/abc"},
            {
                "sendResolved": True,
                "title": '{{ template "msteamsv2.default.title" . }}',
                "text": '{{ template "msteamsv2.default.text" . }}',
            },
            [],
            [],
            id="msteams",
        ),
        pytest.param(
            "googlechat",
            {"webhookUrl": "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t"},
            {
                "sendResolved": False,
                "title": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}',
                "text": (
                    "{{ range .Alerts -}}\n**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}{{ if .Annotations.summary }}\n**Summary:** {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}\n**Description:** {{ .Annotations.description }}{{ end }}\n{{ end }}"
                ),
            },
            [],
            [],
            id="googlechat",
        ),
        pytest.param(
            "jira",
            {
                "site": "https://acme.atlassian.net",
                "project": "OPS",
                "issueType": "Bug",
                "email": "oncall@integration.test",
                "apiToken": "jira-api-token",
            },
            {
                "sendResolved": False,
                "summary": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}',
                "description": (
                    "{{ range .Alerts -}}\n"
                    "**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}\n"
                    "{{ if .Annotations.summary }}\n"
                    "**Summary:** {{ .Annotations.summary }}\n"
                    "{{ end }}{{ if .Annotations.description }}\n"
                    "**Description:** {{ .Annotations.description }}\n"
                    "{{ end }}\n"
                    "{{ end }}"
                ),
                "reopenDuration": "3d",
            },
            ["priority", "resolveTransition", "reopenTransition", "wontFixResolution"],
            ["labels", "customFields"],
            id="jira",
        ),
        pytest.param(
            "jsmops",
            {"apiKey": "jsm-api-key"},
            {
                "sendResolved": False,
                "message": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}',
                "description": (
                    "{{ range .Alerts -}}\n"
                    "**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}\n"
                    "\n"
                    "{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}\n"
                    "\n"
                    "{{ end }}{{ if .GeneratorURL }}[View in SigNoz]({{ .GeneratorURL }})\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.related_logs }}[View related logs]({{ .Annotations.related_logs }})\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.related_traces }}[View related traces]({{ .Annotations.related_traces }})\n"
                    "\n"
                    "{{ end }}{{ end }}"
                ),
                "tags": "signoz",
            },
            ["priority"],
            [],
            id="jsmops",
        ),
        pytest.param(
            "incidentio",
            {
                "url": "https://api.incident.io/v2/alert_events/http/01ABCDEF",
                "token": "incidentio-token",
            },
            {
                "sendResolved": False,
                "title": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}',
                "description": (
                    "{{ range .Alerts -}}\n"
                    "**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}\n"
                    "\n"
                    "{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}\n"
                    "\n"
                    "{{ end }}{{ if .GeneratorURL }}[View in SigNoz]({{ .GeneratorURL }})\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.related_logs }}[View related logs]({{ .Annotations.related_logs }})\n"
                    "\n"
                    "{{ end }}{{ if .Annotations.related_traces }}[View related traces]({{ .Annotations.related_traces }})\n"
                    "\n"
                    "{{ end }}{{ end }}"
                ),
            },
            [],
            ["metadata"],
            id="incidentio",
        ),
    ],
)
def test_create_minimal_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    kind: str,
    request_spec: dict,
    expected_defaults: dict,
    fields_without_default: list[str],
    fields_read_as_null: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": f"v2-minimal-{kind}-{uuid.uuid4().hex[:8]}", "config": {"kind": kind, "spec": request_spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{created['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    fetched = response.json()["data"]

    # Omitted fields read back as their default, as "" when they have none, and
    # as null when they are collections.
    expected_spec = {**request_spec, **expected_defaults, **dict.fromkeys(fields_without_default, ""), **dict.fromkeys(fields_read_as_null, None)}
    assert created["config"]["spec"] == expected_spec
    assert fetched["config"]["spec"] == expected_spec


def test_create_with_generate_name_derives_a_distinct_dns1123_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    display_name = f"On Call Escalation {uuid.uuid4().hex[:8]}"
    names = []

    # Both display names slugify to the same prefix, so only the random suffix
    # keeps the generated names apart.
    for variant in (display_name, display_name.upper()):
        response = requests.post(
            signoz.self.host_configs["8080"].get(V2_BASE_URL),
            json={
                "generateName": True,
                "displayName": variant,
                "config": {"kind": "email", "spec": {"to": "generated@integration.test", "html": "<p>body</p>"}},
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text
        created = response.json()["data"]
        cleanup_notification_channels.append(created["id"])

        assert created["displayName"] == variant
        assert DNS1123_LABEL.match(created["name"]), created["name"]
        assert created["name"].startswith("on-call-escalation-")
        names.append(created["name"])

    assert names[0] != names[1]


@pytest.mark.parametrize(
    "create_spec,update_spec,expected_values_after_update,fields_read_as_null_after_update",
    [
        pytest.param(
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "fields": [{"title": "Severity", "value": "{{ .CommonLabels.severity }}"}],
                "actions": [{"type": "button", "text": "Open", "url": "{{ .CommonLabels.ruleSource }}", "style": "primary", "name": "open", "value": "signoz"}],
            },
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "fields": [],
            },
            {"fields": []},
            ["actions"],
            id="list_sent_empty_and_list_omitted",
        ),
        pytest.param(
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
                "channel": "#alerts",
                "fields": [{"title": "Severity", "value": "{{ .CommonLabels.severity }}"}],
            },
            {
                "apiUrl": "https://hooks.slack.test/services/T/B/X",
            },
            {"channel": ""},
            ["fields"],
            id="string_and_list_omitted",
        ),
    ],
)
def test_update_replaces_the_whole_spec(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
    create_spec: dict,
    update_spec: dict,
    expected_values_after_update: dict,
    fields_read_as_null_after_update: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": f"v2-update-{uuid.uuid4().hex[:8]}", "config": {"kind": "slack", "spec": create_spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    cleanup_notification_channels.append(created["id"])
    for field, value in create_spec.items():
        assert created["config"]["spec"][field] == value, field

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{created['id']}"),
        json={"config": {"kind": "slack", "spec": update_spec}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    updated = response.json()["data"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{created['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    fetched = response.json()["data"]

    # Nothing from the create survives unless the update sends it again.
    for spec_read in (updated["config"]["spec"], fetched["config"]["spec"]):
        for field, value in expected_values_after_update.items():
            assert spec_read[field] == value, field
        for field in fields_read_as_null_after_update:
            assert spec_read[field] is None, field


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
    assert updated["config"]["spec"]["apiUrl"] == "https://hooks.slack.test/services/T/B/Z"
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
    # msteams is the one kind whose name differs from its v1 type, so it is the
    # filter case that can go wrong.
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
