# pylint: disable=line-too-long
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

logger = setup_logger(__name__)


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

# MSTeams default config
msteams_default_config = {
    "msteamsv2_configs": [
        {
            "webhook_url": "msteams/webhook_url",  # base_url configured on runtime
            "title": '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n {{" "}}(\n {{- with .CommonLabels.Remove .GroupLabels.Names }}\n {{- range $index, $label := .SortedPairs -}}\n {{ if $index }}, {{ end }}\n {{- $label.Name }}="{{ $label.Value -}}"\n {{- end }}\n {{- end -}}\n )\n {{- end }}',
            "text": '{{ range .Alerts -}}\r\n *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\r\n\r\n *Summary:* {{ .Annotations.summary }}\r\n *Description:* {{ .Annotations.description }}\r\n *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}\r\n *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}\r\n\r\n *Details:*\r\n {{ range .Labels.SortedPairs -}}\r\n   {{- if ne .Name "ruleId" -}}\r\n \u2022 *{{ .Name }}:* {{ .Value }}\r\n   {{ end -}}\r\n {{ end -}}\r\n{{ end }}',
        }
    ],
}

# pagerduty default config
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
# opsgenie default config
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
    ]
}

# webhook default config
webhook_default_config = {
    "webhook_configs": [
        {
            "url": "webhook/webhook_url",  # base_url configured on runtime
        }
    ],
}
# email default config
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


@pytest.fixture(name="notification_channel", scope="package")
def notification_channel(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for WireMock container to receive notifications for Alert rules.
    """

    def create() -> types.TestContainerDocker:
        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_network(network)
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
            container_configs={"8080": types.TestContainerUrlConfig("http", container.get_wrapped_container().name, 8080)},
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

    def _create_notification_channel(channel_config: dict) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels"),
            json=channel_config,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, f"Failed to create channel, Response: {response.text} Response status: {response.status_code}"
        return response.json()["data"]["id"]

    return _create_notification_channel


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
