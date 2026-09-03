# pylint: disable=line-too-long
import json
import re
import time
import uuid
from collections.abc import Callable
from http import HTTPStatus
from pathlib import Path

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import Network
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import reuse, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.maildev import MAILDEV_INCOMING_PASS, SMTP_TEST_FROM
from fixtures.tls import CA_ID_LABEL, KEYSTORE_PASSWORD, ca_id, issue_server_keystore

logger = setup_logger(__name__)

# Google Chat validates the webhook host, so the WireMock container joins the
# network under this alias and serves HTTPS on 443 with a certificate issued by
# the integration CA that signoz trusts; channels point at https://<host>/...
GOOGLE_CHAT_HOST = "chat.googleapis.com"
# incident.io doesn't pin the host, but the same alias trick keeps channel URLs
# identical to production ones.
INCIDENTIO_HOST = "api.incident.io"
TLS_HOSTS = [GOOGLE_CHAT_HOST, INCIDENTIO_HOST]

# A reused container serving a cert without a newly added host (or missing its
# network alias) fails TLS opaquely; this label records the hosts it was built
# for so stale() recreates it when the list changes.
TLS_HOSTS_LABEL = "signoz.integration.tls-hosts"


EMAIL_TRANSPORT_KEYS = [
    "from",
    "hello",
    "smarthost",
    "auth_username",
    "auth_password",
    "auth_password_file",
    "auth_secret",
    "auth_secret_file",
    "auth_identity",
    "require_tls",
    "tls_config",
    "force_implicit_tls",
]


def assert_email_channel_payload_clean(payload: str) -> None:
    receiver = json.loads(payload)
    for email_config in receiver["email_configs"]:
        transport_keys = set(email_config.keys()) & set(EMAIL_TRANSPORT_KEYS)
        transport_keys -= {"smarthost"} if email_config.get("smarthost", "") == "" else set()
        assert not transport_keys, f"email channel payload carries transport keys {transport_keys}: {payload}"

    assert MAILDEV_INCOMING_PASS not in payload
    assert SMTP_TEST_FROM not in payload


"""
Default notification channel configs shared across alertmanager tests.
"""
slack_default_config = {
    # channel name configured on runtime
    "slack_configs": [
        {
            "api_url": "services/TEAM_ID/BOT_ID/TOKEN_ID",  # base_url configured on runtime
            "title": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n {{" "}}(\n {{- with .CommonLabels.Remove .GroupLabels.Names }}\n {{- range $index, $label := .SortedPairs -}}\n {{ if $index }}, {{ end }}\n {{- $label.Name }}="{{ $label.Value -}}"\n {{- end }}\n {{- end -}}\n )\n {{- end }}',
            "text": '{{ range .Alerts -}}\r\n *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\r\n\r\n *Summary:* {{ .Annotations.summary }}\r\n *Description:* {{ .Annotations.description }}\r\n *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}\r\n *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}\r\n\r\n *Details:*\r\n {{ range .Labels.SortedPairs -}}\r\n   {{- if ne .Name "ruleId" -}}\r\n \u2022 *{{ .Name }}:* {{ .Value }}\r\n   {{ end -}}\r\n {{ end -}}\r\n{{ end }}',
        }
    ],
}

msteams_default_config = {
    "msteamsv2_configs": [
        {
            "webhook_url": "msteams/webhook_url",  # base_url configured on runtime
            "title": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n {{" "}}(\n {{- with .CommonLabels.Remove .GroupLabels.Names }}\n {{- range $index, $label := .SortedPairs -}}\n {{ if $index }}, {{ end }}\n {{- $label.Name }}="{{ $label.Value -}}"\n {{- end }}\n {{- end -}}\n )\n {{- end }}',
            "text": '{{ range .Alerts -}}\r\n *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\r\n\r\n *Summary:* {{ .Annotations.summary }}\r\n *Description:* {{ .Annotations.description }}\r\n *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}\r\n *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}\r\n\r\n *Details:*\r\n {{ range .Labels.SortedPairs -}}\r\n   {{- if ne .Name "ruleId" -}}\r\n \u2022 *{{ .Name }}:* {{ .Value }}\r\n   {{ end -}}\r\n {{ end -}}\r\n{{ end }}',
        }
    ],
}

pagerduty_default_config = {
    "pagerduty_configs": [
        {
            "routing_key": "PagerDutyRoutingKey",
            "url": "v2/enqueue",  # base_url configured on runtime
            "client": "SigNoz Alert Manager",
            "client_url": "https://enter-signoz-host-n-port-here/alerts",
            "description": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n\t{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n\t {{" "}}(\n\t {{- with .CommonLabels.Remove .GroupLabels.Names }}\n\t\t{{- range $index, $label := .SortedPairs -}}\n\t\t {{ if $index }}, {{ end }}\n\t\t {{- $label.Name }}="{{ $label.Value -}}"\n\t\t{{- end }}\n\t {{- end -}}\n\t )\n\t{{- end }}',
            "details": {
                "firing": '{{ template "pagerduty.default.instances" .Alerts.Firing }}',
                "num_firing": "{{ .Alerts.Firing | len }}",
                "num_resolved": "{{ .Alerts.Resolved | len }}",
                "resolved": '{{ template "pagerduty.default.instances" .Alerts.Resolved }}',
            },
            "source": "SigNoz Alert Manager",
            "severity": "{{ (index .Alerts 0).Labels.severity }}",
        }
    ],
}

opsgenie_default_config = {
    "opsgenie_configs": [
        {
            "api_key": "OpsGenieAPIKey",
            "api_url": "/",  # base_url configured on runtime
            "description": '{{ if gt (len .Alerts.Firing) 0 -}}\r\n\tAlerts Firing:\r\n\t{{ range .Alerts.Firing }}\r\n\t - Message: {{ .Annotations.description }}\r\n\tLabels:\r\n\t{{ range .Labels.SortedPairs -}}\r\n\t\t{{- if ne .Name "ruleId" }}   - {{ .Name }} = {{ .Value }}\r\n\t{{ end -}}\r\n\t{{- end }}   Annotations:\r\n\t{{ range .Annotations.SortedPairs }}   - {{ .Name }} = {{ .Value }}\r\n\t{{ end }}   Source: {{ .GeneratorURL }}\r\n\t{{ end }}\r\n{{- end }}\r\n{{ if gt (len .Alerts.Resolved) 0 -}}\r\n\tAlerts Resolved:\r\n\t{{ range .Alerts.Resolved }}\r\n\t - Message: {{ .Annotations.description }}\r\n\tLabels:\r\n\t{{ range .Labels.SortedPairs -}}\r\n\t\t{{- if ne .Name "ruleId" }}   - {{ .Name }} = {{ .Value }}\r\n\t{{ end -}}\r\n\t{{- end }}   Annotations:\r\n\t{{ range .Annotations.SortedPairs }}   - {{ .Name }} = {{ .Value }}\r\n\t{{ end }}   Source: {{ .GeneratorURL }}\r\n\t{{ end }}\r\n{{- end }}',
            "priority": '{{ if eq (index .Alerts 0).Labels.severity "critical" }}P1{{ else if eq (index .Alerts 0).Labels.severity "warning" }}P2{{ else if eq (index .Alerts 0).Labels.severity "info" }}P3{{ else }}P4{{ end }}',
            "message": "{{ .CommonLabels.alertname }}",
            "details": {},
        }
    ],
}

webhook_default_config = {
    "webhook_configs": [
        {
            "url": "webhook/webhook_url",  # base_url configured on runtime
        }
    ],
}

email_default_config = {
    "email_configs": [
        {
            "to": "test@example.com",
            "html": '<html><body>{{ range .Alerts -}}\r\n *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\r\n\r\n *Summary:* {{ .Annotations.summary }}\r\n *Description:* {{ .Annotations.description }}\r\n *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}\r\n *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}\r\n\r\n *Details:*\r\n {{ range .Labels.SortedPairs -}}\r\n   {{- if ne .Name "ruleId" -}}\r\n \u2022 *{{ .Name }}:* {{ .Value }}\r\n   {{ end -}}\r\n {{ end -}}\r\n{{ end }}</body></html>',
            "headers": {
                "Subject": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n {{" "}}(\n {{- with .CommonLabels.Remove .GroupLabels.Names }}\n {{- range $index, $label := .SortedPairs -}}\n {{ if $index }}, {{ end }}\n {{- $label.Name }}="{{ $label.Value -}}"\n {{- end }}\n {{- end -}}\n )\n {{- end }}'
            },
        }
    ],
}


def googlechat_config(space: str) -> dict:
    """Google Chat channel config for a per-test WireMock space path. Title/text are
    omitted so the backend applies its default templates. The host is injected at
    runtime by update_raw_channel_config."""
    return {
        "googlechat_configs": [
            {
                "webhook_url": f"/v1/spaces/{space}/messages",  # host set on runtime
            }
        ],
    }


def googlechat_ok_mappings(path: str) -> list[Mapping]:
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=200, json_body={"name": "spaces/x/messages/x"}),
        )
    ]


def googlechat_retry_mappings(path: str) -> list[Mapping]:
    """429 on the first call then 200, via a wiremock scenario transition."""
    scenario = f"gc-retry-{path}"
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=429, json_body={"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}),
            scenario_name=scenario,
            required_scenario_state="Started",
            new_scenario_state="ok",
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=200, json_body={"name": "spaces/x/messages/x"}),
            scenario_name=scenario,
            required_scenario_state="ok",
        ),
    ]


def googlechat_card_subset(alertname: str, buttons: list[tuple[str, str]]) -> dict:
    """A cardsV2 subset asserting title, firing banner, rendered body, and each
    button's text AND deep-link url (as a regex), so a broken link is caught too.
    buttons: list of (text, url_regex)."""
    return {
        "text": f"[FIRING:1] {alertname}",
        "cardsV2": [
            {
                "cardId": "signoz-alert",
                "card": {
                    "header": {"title": f"[FIRING:1] {alertname}"},
                    "sections": [
                        # firing banner
                        {"widgets": [{"textParagraph": {"text": re.compile("FIRING")}}]},
                        # rendered alert body mentions the alertname
                        {"widgets": [{"textParagraph": {"text": re.compile(re.escape(alertname))}}]},
                    ]
                    + [{"widgets": [{"buttonList": {"buttons": [{"text": text, "onClick": {"openLink": {"url": re.compile(url)}}}]}}]} for text, url in buttons],
                },
            }
        ],
    }


INCIDENTIO_TEST_TOKEN = "incidentio-test-token"  # noqa: S105


def incidentio_path(source_id: str) -> str:
    return f"/v2/alert_events/http/{source_id}"


def incidentio_config(source_id: str) -> dict:
    """incident.io channel config for a per-test alert source id. Title/description
    are omitted so the backend applies its default templates. The URL host is the
    wiremock network alias, so no runtime injection is needed."""
    return {
        "incidentio_configs": [
            {
                "url": f"https://{INCIDENTIO_HOST}{incidentio_path(source_id)}",
                "token": INCIDENTIO_TEST_TOKEN,
            }
        ],
    }


# recorded incident.io Alert Events V2 responses: 202 accepted-for-processing
# echoing the dedup key; errors are {type, status, errors: [{code, message}]}
def incidentio_ok_mappings(path: str) -> list[Mapping]:
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=202, json_body={"status": "accepted", "message": "Event accepted for processing", "deduplication_key": "x"}),
        )
    ]


def incidentio_retry_mappings(path: str) -> list[Mapping]:
    """429 on the first call then 202, via a wiremock scenario transition."""
    scenario = f"incidentio-retry-{path}"
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=429, json_body={"type": "rate_limit_error", "status": 429}),
            scenario_name=scenario,
            required_scenario_state="Started",
            new_scenario_state="ok",
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=202, json_body={"status": "accepted", "message": "Event accepted for processing", "deduplication_key": "x"}),
            scenario_name=scenario,
            required_scenario_state="ok",
        ),
    ]


def incidentio_event_subset(alertname: str, links: list[tuple[str, str]]) -> dict:
    """An alert-event subset asserting title, firing status, dedup key, SigNoz
    source_url, metadata labels, and each markdown link's text AND url (as a
    regex), so a broken link is caught too. links: (text, url_regex) pairs in
    default-template order (View in SigNoz -> related logs -> related traces)."""
    description = "(?s)" + re.escape(f"**Alert:** {alertname}")
    for text, url in links:
        description += rf".*\[{re.escape(text)}\]\([^)]*{url}"
    return {
        "title": f"[FIRING:1] {alertname}",
        "status": "firing",
        "deduplication_key": re.compile(r".+"),
        "source_url": re.compile(r"/alerts/overview\?ruleId="),
        "description": re.compile(description),
        "metadata": {"alertname": alertname},
    }


@pytest.fixture(name="notification_channel", scope="package")
def notification_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    tls: types.TLS,
    tmpfs: Callable[[str], Path],
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for WireMock container to receive notifications for Alert rules.
    """

    def create() -> types.TestContainerDocker:
        # http:8080 for admin API + plain webhook delivery; https:443 aliased as
        # chat.googleapis.com with a CA-issued cert so Google Chat's validated
        # webhook host routes here over real TLS (signoz trusts the integration CA).
        keystore_path = issue_server_keystore(tls, tmpfs("notification-channel-certs"), *TLS_HOSTS)

        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_volume_mapping(str(keystore_path.parent), "/certs", "ro")
        container.with_network(network)
        container.with_network_aliases(*TLS_HOSTS)
        container.with_kwargs(labels={CA_ID_LABEL: ca_id(tls), TLS_HOSTS_LABEL: ",".join(TLS_HOSTS)})

        try:
            container.start(f"--port 8080 --https-port 443 --https-keystore /certs/keystore.p12 --keystore-type PKCS12 --keystore-password {KEYSTORE_PASSWORD}")
        except Exception:
            # Ryuk is disabled: a started-but-unready container would survive and
            # keep squatting on the chat.googleapis.com alias, poisoning DNS for
            # any replacement on the shared network.
            container.stop()
            raise

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig(
                    "http",
                    container.get_container_host_ip(),
                    container.get_exposed_port(8080),
                )
            },
            container_configs={
                "8080": types.TestContainerUrlConfig("http", container.get_wrapped_container().name, 8080),
                # Google Chat delivery: https to the validated host via the network alias.
                "443": types.TestContainerUrlConfig("https", GOOGLE_CHAT_HOST, 443),
            },
        )

    def delete(container: types.TestContainerDocker):
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of NotificationChannel, NotificationChannel(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    def stale(container: types.TestContainerDocker) -> bool:
        # A container built against a rotated/absent CA can't serve a cert signoz
        # trusts; recreate it instead of failing TLS opaquely.
        client = docker.from_env()
        try:
            labels = client.containers.get(container_id=container.id).attrs["Config"]["Labels"]
        except docker.errors.NotFound:
            return True
        return labels.get(CA_ID_LABEL) != ca_id(tls) or labels.get(TLS_HOSTS_LABEL) != ",".join(TLS_HOSTS)

    return reuse.wrap(
        request,
        pytestconfig,
        "notification_channel",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
        stale=stale,
    )


@pytest.fixture(name="create_notification_channel", scope="function")
def create_notification_channel(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> Callable[[dict], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    channel_ids = []

    def _create_notification_channel(channel_config: dict) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels"),
            json=channel_config,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, f"Failed to create channel, Response: {response.text} Response status: {response.status_code}"
        channel_id = response.json()["data"]["id"]
        channel_ids.append(channel_id)
        return channel_id

    yield _create_notification_channel

    for channel_id in channel_ids:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        if response.status_code != HTTPStatus.NO_CONTENT:
            logger.error("Failed to delete channel: %s", {"channel_id": channel_id, "status": response.status_code, "response": response.text})


@pytest.fixture(name="create_webhook_notification_channel", scope="function")
def create_webhook_notification_channel(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> Callable[[str, str, dict, bool], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # function to create notification channel
    def _create_webhook_notification_channel(
        channel_name: str,
        webhook_url: str,
        http_config: dict = {},
        send_resolved: bool = True,
    ) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels"),
            json={
                "name": channel_name,
                "webhook_configs": [
                    {
                        "send_resolved": send_resolved,
                        "url": webhook_url,
                        "http_config": http_config,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, f"Failed to create channel, Response: {response.text} Response status: {response.status_code}"

        channel_id = response.json()["data"]["id"]
        return channel_id

    return _create_webhook_notification_channel


def wait_for_org_registration(signoz: types.SigNoz, token: str, notification_channel: types.TestContainerDocker, wait_seconds: int = 60) -> None:
    """Polls until the org's alertmanager server is registered (one poll tick).

    channels/test 404s until then, before reaching any notifier. The sentinel
    receiver posts to its own unstubbed wiremock path, so request journals
    asserted by tests stay clean."""
    sentinel = {
        "name": str(uuid.uuid4()),
        "webhook_configs": [{"url": notification_channel.container_configs["8080"].get("/org-registration-sentinel")}],
    }
    deadline = time.time() + wait_seconds
    last = None
    while time.time() < deadline:
        last = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
            json=sentinel,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if last.status_code != HTTPStatus.NOT_FOUND:
            return
        time.sleep(2)
    raise AssertionError(f"org alertmanager did not register within {wait_seconds}s, last response: {last.status_code} {last.text}")


def send_test_notification(signoz: types.SigNoz, token: str, receiver: dict, wait_seconds: int = 90) -> None:
    deadline = time.time() + wait_seconds
    last = None
    while time.time() < deadline:
        last = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels/test"),
            json=receiver,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if last.status_code == HTTPStatus.NO_CONTENT:
            return
        time.sleep(2)
    raise AssertionError(f"test notification did not succeed within {wait_seconds}s, last response: {last.status_code} {last.text}")
