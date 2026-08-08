# pylint: disable=line-too-long
import json
import time
from collections.abc import Callable
from http import HTTPStatus

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import Network
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import reuse, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.maildev import MAILDEV_INCOMING_PASS, SMTP_TEST_FROM

logger = setup_logger(__name__)

# Google Chat validates the webhook host, so the WireMock container is aliased as
# this hostname on the docker network and channels point at https://<host>:8443/...
GOOGLE_CHAT_HOST = "chat.googleapis.com"


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
    omitted so the backend applies its default templates. The host + tls-skip are
    injected at runtime by update_raw_channel_config."""
    return {
        "googlechat_configs": [
            {
                "webhook_url": f"/v1/spaces/{space}/messages",  # host set on runtime
            }
        ],
    }


@pytest.fixture(name="notification_channel", scope="package")
def notification_channel(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for WireMock container to receive notifications for Alert rules.
    """

    # A --reuse cache from before the https:8443 alias was added lacks the "8443"
    # config that Google Chat delivery needs (and its container lacks the port/alias).
    # Drop such a stale cache + container so the fixture recreates a correct one,
    # instead of raising KeyError on container_configs["8443"].
    cached = pytestconfig.cache.get("notification_channel", None)
    if cached and "8443" not in (cached.get("container_configs") or {}):
        logger.info("Recreating stale notification_channel (cache missing https:8443)")
        try:
            docker.from_env().containers.get(cached["id"]).remove(force=True)
        except docker.errors.NotFound:
            pass
        pytestconfig.cache.set("notification_channel", None)

    def create() -> types.TestContainerDocker:
        # http:8080 admin/webhook delivery, plus https:8443 aliased as
        # chat.googleapis.com so Google Chat's validated webhook host routes here.
        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_cli_arg("--https-port", "8443")
        container.with_exposed_ports(8080)  # 8443 reached in-network via the alias, no host mapping needed
        container.with_network(network)
        container.with_network_aliases(GOOGLE_CHAT_HOST)
        container.start()

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
                "8443": types.TestContainerUrlConfig("https", GOOGLE_CHAT_HOST, 8443),
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

    return reuse.wrap(
        request,
        pytestconfig,
        "notification_channel",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
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
