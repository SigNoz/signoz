package alertmanagertypes

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The spec types and the upstream configs they translate through carry the same
// field sets, and nothing but this couples them: a field missing from either
// direction of the mapping is silently dropped. Every field is set so no default
// can fill the gap and hide it, and the whole spec is compared so a dropped
// field fails rather than going unasserted. Webhook is covered by
// TestPostableChannelToReceiverRoundTripsWebhookAuthModes, whose auth modes are
// mutually exclusive and so cannot all be set at once.
func TestChannelToPostableChannelRoundTripsEveryFieldOfEveryKind(t *testing.T) {
	sendResolved := true

	testCases := []struct {
		description       string
		kind              ChannelKind
		spec              any
		expectedRoundTrip any
	}{
		{
			description: "slack",
			kind:        ChannelKindSlack,
			spec: &ChannelSlackConfig{
				SendResolved: &sendResolved,
				APIURL:       "https://hooks.slack.com/services/T/B/X",
				Channel:      "#alerts",
				Title:        valuer.MustNewUnsetOrNonEmptyString("slack title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("slack text"),
			},
			expectedRoundTrip: &ChannelSlackConfig{
				SendResolved: &sendResolved,
				APIURL:       "https://hooks.slack.com/services/T/B/X",
				Channel:      "#alerts",
				Title:        valuer.MustNewUnsetOrNonEmptyString("slack title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("slack text"),
			},
		},
		{
			description: "email",
			kind:        ChannelKindEmail,
			spec: &ChannelEmailConfig{
				SendResolved: &sendResolved,
				To:           "team@example.com",
				HTML:         valuer.MustNewUnsetOrNonEmptyString("<p>email body</p>"),
				Headers:      map[string]string{"Subject": "email subject"},
			},
			expectedRoundTrip: &ChannelEmailConfig{
				SendResolved: &sendResolved,
				To:           "team@example.com",
				HTML:         valuer.MustNewUnsetOrNonEmptyString("<p>email body</p>"),
				Headers:      map[string]string{"Subject": "email subject"},
			},
		},
		{
			description: "pagerduty",
			kind:        ChannelKindPagerduty,
			spec: &ChannelPagerdutyConfig{
				SendResolved: &sendResolved,
				RoutingKey:   "routing-key",
				URL:          "https://events.example.com/v2/enqueue",
				Source:       valuer.MustNewUnsetOrNonEmptyString("pagerduty source"),
				Client:       valuer.MustNewUnsetOrNonEmptyString("pagerduty client"),
				ClientURL:    valuer.MustNewUnsetOrNonEmptyString("https://client.example.com"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("pagerduty description"),
				Severity:     "critical",
				Component:    "api",
				Group:        "platform",
				Class:        "deploy",
				Details:      map[string]string{"env": "prod"},
			},
			// Map-valued fields are merged with the notifier's defaults rather
			// than replaced, so a read cannot tell the caller's entries from
			// upstream's. Clients that diff a read against their own input
			// (Terraform) see the extra keys.
			expectedRoundTrip: &ChannelPagerdutyConfig{
				SendResolved: &sendResolved,
				RoutingKey:   "routing-key",
				URL:          "https://events.example.com/v2/enqueue",
				Source:       valuer.MustNewUnsetOrNonEmptyString("pagerduty source"),
				Client:       valuer.MustNewUnsetOrNonEmptyString("pagerduty client"),
				ClientURL:    valuer.MustNewUnsetOrNonEmptyString("https://client.example.com"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("pagerduty description"),
				Severity:     "critical",
				Component:    "api",
				Group:        "platform",
				Class:        "deploy",
				Details: map[string]string{
					"env":          "prod",
					"firing":       "{{ .Alerts.Firing | toJson }}",
					"num_firing":   "{{ .Alerts.Firing | len }}",
					"num_resolved": "{{ .Alerts.Resolved | len }}",
					"resolved":     "{{ .Alerts.Resolved | toJson }}",
				},
			},
		},
		{
			description: "opsgenie",
			kind:        ChannelKindOpsgenie,
			spec: &ChannelOpsgenieConfig{
				SendResolved: &sendResolved,
				APIKey:       "api-key",
				APIURL:       "https://api.eu.opsgenie.com",
				Message:      valuer.MustNewUnsetOrNonEmptyString("opsgenie message"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("opsgenie description"),
				Source:       valuer.MustNewUnsetOrNonEmptyString("opsgenie source"),
				Priority:     "P1",
				Details:      map[string]string{"env": "prod"},
			},
			expectedRoundTrip: &ChannelOpsgenieConfig{
				SendResolved: &sendResolved,
				APIKey:       "api-key",
				APIURL:       "https://api.eu.opsgenie.com",
				Message:      valuer.MustNewUnsetOrNonEmptyString("opsgenie message"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("opsgenie description"),
				Source:       valuer.MustNewUnsetOrNonEmptyString("opsgenie source"),
				Priority:     "P1",
				Details:      map[string]string{"env": "prod"},
			},
		},
		{
			description: "msteams",
			kind:        ChannelKindMSTeams,
			spec: &ChannelMSTeamsConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://teams.example.com/hook",
				Title:        valuer.MustNewUnsetOrNonEmptyString("msteams title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("msteams text"),
			},
			expectedRoundTrip: &ChannelMSTeamsConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://teams.example.com/hook",
				Title:        valuer.MustNewUnsetOrNonEmptyString("msteams title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("msteams text"),
			},
		},
		{
			description: "googlechat",
			kind:        ChannelKindGoogleChat,
			spec: &ChannelGoogleChatConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://chat.googleapis.com/v1/spaces/s/messages",
				Title:        valuer.MustNewUnsetOrNonEmptyString("googlechat title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("googlechat text"),
			},
			expectedRoundTrip: &ChannelGoogleChatConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://chat.googleapis.com/v1/spaces/s/messages",
				Title:        valuer.MustNewUnsetOrNonEmptyString("googlechat title"),
				Text:         valuer.MustNewUnsetOrNonEmptyString("googlechat text"),
			},
		},
		{
			description: "jira",
			kind:        ChannelKindJira,
			spec: &ChannelJiraConfig{
				SendResolved:      &sendResolved,
				Site:              "https://acme.atlassian.net",
				Project:           "OPS",
				IssueType:         "Bug",
				Summary:           valuer.MustNewUnsetOrNonEmptyString("jira summary"),
				Description:       valuer.MustNewUnsetOrNonEmptyString("jira description"),
				Priority:          "High",
				Labels:            []string{"signoz", "alert"},
				ResolveTransition: "Done",
				ReopenTransition:  "Reopen",
				ReopenDuration:    valuer.MustNewUnsetOrNonEmptyString("3d"),
				WontFixResolution: "Won't Do",
				CustomFields:      map[string]any{"customfield_10010": "Ops"},
				Email:             "oncall@acme.com",
				APIToken:          "api-token",
			},
			expectedRoundTrip: &ChannelJiraConfig{
				SendResolved:      &sendResolved,
				Site:              "https://acme.atlassian.net",
				Project:           "OPS",
				IssueType:         "Bug",
				Summary:           valuer.MustNewUnsetOrNonEmptyString("jira summary"),
				Description:       valuer.MustNewUnsetOrNonEmptyString("jira description"),
				Priority:          "High",
				Labels:            []string{"signoz", "alert"},
				ResolveTransition: "Done",
				ReopenTransition:  "Reopen",
				ReopenDuration:    valuer.MustNewUnsetOrNonEmptyString("3d"),
				WontFixResolution: "Won't Do",
				CustomFields:      map[string]any{"customfield_10010": "Ops"},
				Email:             "oncall@acme.com",
				APIToken:          "api-token",
			},
		},
		{
			description: "jsmops",
			kind:        ChannelKindJSMOps,
			spec: &ChannelJSMOpsConfig{
				SendResolved: &sendResolved,
				APIKey:       "api-key",
				Message:      valuer.MustNewUnsetOrNonEmptyString("jsmops message"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("jsmops description"),
				Priority:     "P1",
				Tags:         valuer.MustNewUnsetOrNonEmptyString("signoz,oncall"),
			},
			expectedRoundTrip: &ChannelJSMOpsConfig{
				SendResolved: &sendResolved,
				APIKey:       "api-key",
				Message:      valuer.MustNewUnsetOrNonEmptyString("jsmops message"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("jsmops description"),
				Priority:     "P1",
				Tags:         valuer.MustNewUnsetOrNonEmptyString("signoz,oncall"),
			},
		},
		{
			description: "incidentio",
			kind:        ChannelKindIncidentIO,
			spec: &ChannelIncidentIOConfig{
				SendResolved: &sendResolved,
				URL:          "https://api.incident.io/v2/alert_events/http/01ABC",
				Token:        "token",
				Title:        valuer.MustNewUnsetOrNonEmptyString("incidentio title"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("incidentio description"),
				Metadata:     map[string]string{"team": "platform"},
			},
			expectedRoundTrip: &ChannelIncidentIOConfig{
				SendResolved: &sendResolved,
				URL:          "https://api.incident.io/v2/alert_events/http/01ABC",
				Token:        "token",
				Title:        valuer.MustNewUnsetOrNonEmptyString("incidentio title"),
				Description:  valuer.MustNewUnsetOrNonEmptyString("incidentio description"),
				Metadata:     map[string]string{"team": "platform"},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			postable := PostableNotificationChannel{
				Name:        "channel",
				DisplayName: "channel",
				Config:      ChannelConfig{Kind: testCase.kind, Spec: testCase.spec},
			}
			require.NoError(t, postable.Validate())

			receiver, err := postable.ToReceiver()
			require.NoError(t, err)

			channel, err := NewChannelFromReceiverWithName(receiver, postable.Name, "org-1")
			require.NoError(t, err)

			roundTripped, err := channel.toPostableNotificationChannel()
			require.NoError(t, err)

			assert.Equal(t, postable.Name, roundTripped.Name)
			assert.Equal(t, testCase.kind, roundTripped.Config.Kind)
			assert.Equal(t, testCase.expectedRoundTrip, roundTripped.Config.Spec)
		})
	}
}

// Email transport is not representable in the channel spec, and no credential
// may reach storage. stripEmailTransport blanks Smarthost rather than dropping
// it, so the key survives as an empty string.
func TestPostableChannelToReceiverOmitsEmailTransportCredentials(t *testing.T) {
	postable := PostableNotificationChannel{
		Name:        "team",
		DisplayName: "team",
		Config: ChannelConfig{
			Kind: ChannelKindEmail,
			Spec: &ChannelEmailConfig{To: "team@example.com"},
		},
	}

	receiver, err := postable.ToReceiver()
	require.NoError(t, err)

	channel, err := NewChannelFromReceiverWithName(receiver, postable.Name, "org-1")
	require.NoError(t, err)

	for _, credentialKey := range []string{"auth_username", "auth_password", "auth_secret", "tls_config"} {
		assert.NotContains(t, channel.Data, credentialKey)
	}

	assert.Contains(t, channel.Data, `"smarthost":""`)
}

// The UI offers basic auth and bearer token for webhooks, so both must survive a
// round trip. The legacy API overloaded one password field for both.
func TestPostableChannelToReceiverRoundTripsWebhookAuthModes(t *testing.T) {
	// The webhook notifier defaults send_resolved to true, so a spec that omits
	// it reads back with that default rather than as unset.
	sendResolved := config.DefaultWebhookConfig.VSendResolved

	testCases := []struct {
		description       string
		spec              ChannelWebhookConfig
		expectedInData    string
		expectedRoundTrip *ChannelWebhookConfig
	}{
		{
			description:       "basic auth",
			spec:              ChannelWebhookConfig{URL: "https://example.com/hook", Username: "u", Password: "p"},
			expectedInData:    `"basic_auth"`,
			expectedRoundTrip: &ChannelWebhookConfig{SendResolved: &sendResolved, URL: "https://example.com/hook", Username: "u", Password: "p"},
		},
		{
			description:       "bearer token",
			spec:              ChannelWebhookConfig{URL: "https://example.com/hook", BearerToken: "tok"},
			expectedInData:    `"authorization"`,
			expectedRoundTrip: &ChannelWebhookConfig{SendResolved: &sendResolved, URL: "https://example.com/hook", BearerToken: "tok"},
		},
		{
			description:       "no auth",
			spec:              ChannelWebhookConfig{URL: "https://example.com/hook"},
			expectedInData:    `"url"`,
			expectedRoundTrip: &ChannelWebhookConfig{SendResolved: &sendResolved, URL: "https://example.com/hook"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			postable := PostableNotificationChannel{
				Name:        "hook",
				DisplayName: "hook",
				Config:      ChannelConfig{Kind: ChannelKindWebhook, Spec: &testCase.spec},
			}
			require.NoError(t, postable.Validate())

			receiver, err := postable.ToReceiver()
			require.NoError(t, err)

			channel, err := NewChannelFromReceiverWithName(receiver, postable.Name, "org-1")
			require.NoError(t, err)
			assert.Contains(t, channel.Data, testCase.expectedInData)

			roundTripped, err := channel.toPostableNotificationChannel()
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedRoundTrip, roundTripped.Config.Spec)
		})
	}
}

// The SigNoz notifiers validate in their UnmarshalYAML, which ToReceiver reaches
// only through the defaulting round-trip. A spec that passes Validate can still
// be rejected there, and the request has to fail as invalid input rather than as
// an internal error.
func TestPostableChannelToReceiverReportsNotifierValidationAsInvalidInput(t *testing.T) {
	postable := PostableNotificationChannel{
		Name:        "channel",
		DisplayName: "channel",
		Config: ChannelConfig{Kind: ChannelKindIncidentIO, Spec: &ChannelIncidentIOConfig{
			URL: "https://api.incident.io/v2/incidents", Token: "token",
			Title: valuer.MustNewUnsetOrNonEmptyString("incidentio title"), Description: valuer.MustNewUnsetOrNonEmptyString("incidentio description"),
		}},
	}
	require.NoError(t, postable.Validate())

	_, err := postable.ToReceiver()
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "got %v", err)
}

// rejectUnsupportedHTTPConfig enumerates the fields it rejects, so one added
// upstream would pass unnoticed and be dropped on read. Pinning the counts turns
// a dependency bump into a failing test rather than silent data loss.
func TestRejectUnrepresentableHTTPConfigCoversEveryUpstreamMember(t *testing.T) {
	assert.Equal(t, 10, reflect.TypeFor[commoncfg.HTTPClientConfig]().NumField())
	assert.Equal(t, 5, reflect.TypeFor[commoncfg.ProxyConfig]().NumField())
}

func TestChannelToPostableChannelRejectsUnrepresentableChannels(t *testing.T) {
	testCases := []struct {
		description string
		channel     Channel
	}{
		{
			description: "two notifier kinds in one channel",
			channel: Channel{
				DisplayName: "mixed",
				Data:        `{"name":"mixed","slack_configs":[{"channel":"#a"}],"email_configs":[{"to":"a@b.c"}]}`,
			},
		},
		{
			// Only the first would survive the read, and the second would be
			// dropped on the next write.
			description: "two configs of the same notifier kind",
			channel: Channel{
				DisplayName: "two-slacks",
				Data:        `{"name":"two-slacks","slack_configs":[{"channel":"#a"},{"channel":"#b"}]}`,
			},
		},
		{
			description: "no notifier configuration",
			channel: Channel{
				DisplayName: "empty",
				Data:        `{"name":"empty"}`,
			},
		},
		{
			description: "notifier kind outside the supported set",
			channel: Channel{
				DisplayName: "tg",
				Data:        `{"name":"tg","telegram_configs":[{"chat_id":1}]}`,
			},
		},
		{
			description: "legacy msteams v1 configs",
			channel: Channel{
				DisplayName: "old-teams",
				Data:        `{"name":"old-teams","msteams_configs":[{"webhook_url":"https://a"}]}`,
			},
		},
		{
			// Dropping these on read would unauthenticate the channel on the
			// next write, so the read fails instead.
			description: "webhook http_config beyond basic auth and bearer token",
			channel: Channel{
				DisplayName: "proxied",
				Data:        `{"name":"proxied","webhook_configs":[{"url":"https://a","http_config":{"proxy_url":"https://proxy","tls_config":{"insecure_skip_verify":true}}}]}`,
			},
		},
		{
			description: "a modelled notifier kind alongside an unmodelled one",
			channel: Channel{
				DisplayName: "slack-and-telegram",
				Data:        `{"name":"slack-and-telegram","slack_configs":[{"api_url":"https://a","channel":"#a"}],"telegram_configs":[{"chat_id":1,"bot_token":"t"}]}`,
			},
		},
		{
			// The spec models one config per kind, so the second would be lost.
			description: "two configs of one notifier kind",
			channel: Channel{
				DisplayName: "two-slacks",
				Data:        `{"name":"two-slacks","slack_configs":[{"api_url":"https://a","channel":"#a"},{"api_url":"https://b","channel":"#b"}]}`,
			},
		},
		{
			// The spec carries the credentials but not the scheme, so any other
			// scheme would be rewritten as Bearer on the next write.
			description: "webhook authorization scheme other than bearer",
			channel: Channel{
				DisplayName: "token-auth",
				Data:        `{"name":"token-auth","webhook_configs":[{"url":"https://a","http_config":{"authorization":{"type":"Token","credentials":"abc"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "webhook credentials sourced from a file",
			channel: Channel{
				DisplayName: "file-auth",
				Data:        `{"name":"file-auth","webhook_configs":[{"url":"https://a","http_config":{"authorization":{"type":"Bearer","credentials_file":"/run/token"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "webhook basic auth password sourced from a file",
			channel: Channel{
				DisplayName: "file-password",
				Data:        `{"name":"file-password","webhook_configs":[{"url":"https://a","http_config":{"basic_auth":{"username":"u","password_file":"/run/pass"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "webhook inline tls material",
			channel: Channel{
				DisplayName: "inline-tls",
				Data:        `{"name":"inline-tls","webhook_configs":[{"url":"https://a","http_config":{"tls_config":{"ca":"---PEM---","min_version":"TLS12"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			// The upstream kinds lift nothing out of http_config, so any credential
			// or transport setting stored there would be dropped on the next write.
			description: "slack basic auth",
			channel: Channel{
				DisplayName: "slack-basic",
				Data:        `{"name":"slack-basic","slack_configs":[{"api_url":"https://a","channel":"#a","http_config":{"basic_auth":{"username":"u","password":"p"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "opsgenie proxy",
			channel: Channel{
				DisplayName: "og-proxy",
				Data:        `{"name":"og-proxy","opsgenie_configs":[{"api_key":"k","http_config":{"proxy_url":"https://proxy","follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "pagerduty authorization header",
			channel: Channel{
				DisplayName: "pd-bearer",
				Data:        `{"name":"pd-bearer","pagerduty_configs":[{"routing_key":"k","http_config":{"authorization":{"type":"Bearer","credentials":"tok"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "msteams inline tls material",
			channel: Channel{
				DisplayName: "teams-tls",
				Data:        `{"name":"teams-tls","msteamsv2_configs":[{"webhook_url":"https://a","http_config":{"tls_config":{"ca":"---PEM---"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "googlechat basic auth",
			channel: Channel{
				DisplayName: "chat-basic",
				Data:        `{"name":"chat-basic","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/A/messages","http_config":{"basic_auth":{"username":"u","password":"p"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			// ChannelJiraConfig lifts only basic auth out of http_config, because
			// that is all Jira Cloud accepts.
			description: "jira authorization header",
			channel: Channel{
				DisplayName: "jira-bearer",
				Data:        `{"name":"jira-bearer","jira_configs":[{"site":"https://acme.atlassian.net","project":"OPS","issue_type":"Bug","http_config":{"authorization":{"type":"Bearer","credentials":"tok"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			// JSM Ops and incident.io authenticate through their own spec fields,
			// so their specs model no http_config credentials at all.
			description: "jsmops basic auth",
			channel: Channel{
				DisplayName: "jsm-basic",
				Data:        `{"name":"jsm-basic","jsmops_configs":[{"api_key":"key","http_config":{"basic_auth":{"username":"u","password":"p"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
		{
			description: "incidentio authorization header",
			channel: Channel{
				DisplayName: "io-bearer",
				Data:        `{"name":"io-bearer","incidentio_configs":[{"url":"https://api.incident.io/v2/alert_events/http/01ABC","token":"t","http_config":{"authorization":{"type":"Bearer","credentials":"tok"},"follow_redirects":true,"enable_http2":true}}]}`,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			_, err := testCase.channel.toPostableNotificationChannel()
			assert.Error(t, err)
		})
	}
}
