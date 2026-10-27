package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// channelConfig wraps one provider spec in the {kind, spec} envelope every
// channel write carries.
func channelConfig(kind string, spec map[string]any) map[string]any {
	return map[string]any{"kind": kind, "spec": spec}
}

func slackChannelSpec() map[string]any {
	return map[string]any{
		"apiUrl":       "https://hooks.slack.com/services/T000/B000/XXXXXXXX",
		"channel":      "#alerts-platform",
		"sendResolved": true,
	}
}

func pagerdutyChannelSpec() map[string]any {
	return map[string]any{
		"routingKey": "R0000000000000000000000000000000",
		"severity":   "critical",
	}
}

func webhookChannelSpec() map[string]any {
	return map[string]any{
		"url":         "https://alerts.example.com/signoz",
		"bearerToken": "00000000-0000-0000-0000-000000000000",
	}
}

// createNotificationChannelExamples returns one create payload per channel
// kind. Each carries the kind's required fields plus one or two optional ones
// that show a default being overridden.
func createNotificationChannelExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "slack",
			Summary:     "Slack incoming webhook",
			Description: "Posts to a Slack channel through an incoming webhook. `sendResolved` is off by default for Slack, so it is turned on here.",
			Value: map[string]any{
				"name":        "slack-platform",
				"displayName": "Slack platform",
				"config":      channelConfig("slack", slackChannelSpec()),
			},
		},
		{
			Name:        "email",
			Summary:     "Email recipients",
			Description: "Sends to a comma-separated recipient list. SMTP transport comes from the deployment's global config, so only recipients and body are configurable.",
			Value: map[string]any{
				"name":        "email-oncall",
				"displayName": "Email on-call",
				"config": channelConfig("email", map[string]any{
					"to":      "oncall@example.com, platform@example.com",
					"headers": map[string]any{"Subject": "[SigNoz] {{ .CommonLabels.alertname }}"},
				}),
			},
		},
		{
			Name:        "webhook_bearer",
			Summary:     "Webhook with a bearer token",
			Description: "Delivers the Alertmanager webhook payload to an HTTP endpoint. Use either `bearerToken` or `username`/`password`, never both.",
			Value: map[string]any{
				"name":        "webhook-incident-bot",
				"displayName": "Incident bot webhook",
				"config":      channelConfig("webhook", webhookChannelSpec()),
			},
		},
		{
			Name:        "pagerduty",
			Summary:     "PagerDuty Events API v2",
			Description: "Creates PagerDuty incidents through an Events API v2 integration key.",
			Value: map[string]any{
				"name":        "pagerduty-oncall",
				"displayName": "PagerDuty on-call",
				"config":      channelConfig("pagerduty", pagerdutyChannelSpec()),
			},
		},
		{
			Name:        "opsgenie",
			Summary:     "Opsgenie API integration",
			Description: "Creates Opsgenie alerts through an API integration key, pinned to priority P2.",
			Value: map[string]any{
				"name":        "opsgenie-sre",
				"displayName": "Opsgenie SRE",
				"config": channelConfig("opsgenie", map[string]any{
					"apiKey":   "00000000-0000-0000-0000-000000000000",
					"priority": "P2",
				}),
			},
		},
		{
			Name:        "msteams",
			Summary:     "Microsoft Teams incoming webhook",
			Description: "Posts an adaptive card to a Teams channel through an incoming webhook.",
			Value: map[string]any{
				"name":        "msteams-platform",
				"displayName": "Teams platform",
				"config": channelConfig("msteams", map[string]any{
					"webhookUrl": "https://example.webhook.office.com/webhookb2/00000000-0000-0000-0000-000000000000",
				}),
			},
		},
		{
			Name:        "googlechat",
			Summary:     "Google Chat space webhook",
			Description: "Posts to a Google Chat space through its webhook URL.",
			Value: map[string]any{
				"name":        "googlechat-platform",
				"displayName": "Google Chat platform",
				"config": channelConfig("googlechat", map[string]any{
					"webhookUrl": "https://chat.googleapis.com/v1/spaces/AAAA0000000/messages?key=XXXX&token=XXXX",
				}),
			},
		},
		{
			Name:        "jira",
			Summary:     "Jira Cloud issues",
			Description: "Creates one Jira Cloud issue per alert group and reopens it if the alert fires again within `reopenDuration`. Authenticates with an Atlassian account email and API token.",
			Value: map[string]any{
				"name":        "jira-platform",
				"displayName": "Jira platform",
				"config": channelConfig("jira", map[string]any{
					"site":           "https://example.atlassian.net",
					"project":        "OPS",
					"issueType":      "Bug",
					"email":          "oncall@example.com",
					"apiToken":       "XXXXXXXXXXXXXXXXXXXXXXXX",
					"labels":         []any{"signoz", "alert"},
					"reopenDuration": "3d",
				}),
			},
		},
		{
			Name:        "jsmops",
			Summary:     "Jira Service Management Ops",
			Description: "Creates JSM Ops alerts through an integration API key. JSM Ops speaks the Opsgenie alert API, so `priority` takes P1 to P5.",
			Value: map[string]any{
				"name":        "jsmops-oncall",
				"displayName": "JSM Ops on-call",
				"config": channelConfig("jsmops", map[string]any{
					"apiKey":   "00000000-0000-0000-0000-000000000000",
					"priority": "P1",
					"tags":     "signoz,platform",
				}),
			},
		},
		{
			Name:        "incidentio",
			Summary:     "incident.io HTTP alert source",
			Description: "Sends alert events to an incident.io HTTP alert source. `url` and `token` are copied from the source's setup page; the token goes without the Bearer prefix.",
			Value: map[string]any{
				"name":        "incidentio-platform",
				"displayName": "incident.io platform",
				"config": channelConfig("incidentio", map[string]any{
					"url":      "https://api.incident.io/v2/alert_events/http/00000000-0000-0000-0000-000000000000",
					"token":    "XXXXXXXXXXXXXXXXXXXXXXXX",
					"metadata": map[string]any{"team": "platform"},
				}),
			},
		},
	}
}

// updateNotificationChannelExamples shows that an update carries only config:
// name and displayName are immutable, and the kind may change.
func updateNotificationChannelExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "slack_rotate_webhook",
			Summary:     "Replace a Slack webhook URL",
			Description: "Replaces the stored configuration in full; every field not sent falls back to its default.",
			Value:       map[string]any{"config": channelConfig("slack", slackChannelSpec())},
		},
		{
			Name:        "switch_to_pagerduty",
			Summary:     "Change the kind to PagerDuty",
			Description: "The kind may change on update, replacing the channel's notifier configuration while its name and references stay.",
			Value:       map[string]any{"config": channelConfig("pagerduty", pagerdutyChannelSpec())},
		},
	}
}

// testNotificationChannelExamples sends one test notification; the body is a
// configuration only because nothing is persisted.
func testNotificationChannelExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:    "slack",
			Summary: "Test a Slack webhook",
			Value:   map[string]any{"config": channelConfig("slack", slackChannelSpec())},
		},
		{
			Name:    "webhook",
			Summary: "Test a webhook endpoint",
			Value:   map[string]any{"config": channelConfig("webhook", webhookChannelSpec())},
		},
	}
}
