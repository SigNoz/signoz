package alertmanagertypes

import (
	"reflect"
	"testing"

	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostableChannelToReceiverWritesTheExpectedConfigsField(t *testing.T) {
	testCases := []struct {
		description           string
		postable              PostableNotificationChannel
		expectedDerivedType   string
		expectedConfigsInData string
	}{
		{
			description: "slack",
			postable: PostableNotificationChannel{
				Name:        "oncall",
				DisplayName: "oncall",
				Config:      ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://hooks.slack.com/services/T/B/X", Channel: "#alerts"}},
			},
			expectedDerivedType:   "slack",
			expectedConfigsInData: "slack_configs",
		},
		{
			description: "email",
			postable: PostableNotificationChannel{
				Name:        "team",
				DisplayName: "team",
				Config:      ChannelConfig{Kind: ChannelKindEmail, Spec: &ChannelEmailConfig{To: "team@example.com"}},
			},
			expectedDerivedType:   "email",
			expectedConfigsInData: "email_configs",
		},
		{
			description: "webhook",
			postable: PostableNotificationChannel{
				Name:        "hook",
				DisplayName: "hook",
				Config:      ChannelConfig{Kind: ChannelKindWebhook, Spec: &ChannelWebhookConfig{URL: "https://example.com/hook"}},
			},
			expectedDerivedType:   "webhook",
			expectedConfigsInData: "webhook_configs",
		},
		{
			description: "pagerduty",
			postable: PostableNotificationChannel{
				Name:        "pd",
				DisplayName: "pd",
				Config:      ChannelConfig{Kind: ChannelKindPagerduty, Spec: &ChannelPagerdutyConfig{RoutingKey: "abc"}},
			},
			expectedDerivedType:   "pagerduty",
			expectedConfigsInData: "pagerduty_configs",
		},
		{
			description: "opsgenie",
			postable: PostableNotificationChannel{
				Name:        "og",
				DisplayName: "og",
				Config:      ChannelConfig{Kind: ChannelKindOpsgenie, Spec: &ChannelOpsgenieConfig{APIKey: "key"}},
			},
			expectedDerivedType:   "opsgenie",
			expectedConfigsInData: "opsgenie_configs",
		},
		{
			// The msteams type deliberately writes msteamsv2_configs, the only
			// Teams integration alertmanagernotify builds. The type
			// receiverChannelType derives from the stored data is therefore
			// "msteamsv2".
			description: "msteams maps onto msteamsv2",
			postable: PostableNotificationChannel{
				Name:        "teams",
				DisplayName: "teams",
				Config:      ChannelConfig{Kind: ChannelKindMSTeams, Spec: &ChannelMSTeamsConfig{WebhookURL: "https://teams.example.com/hook"}},
			},
			expectedDerivedType:   "msteamsv2",
			expectedConfigsInData: "msteamsv2_configs",
		},
		{
			description: "googlechat",
			postable: PostableNotificationChannel{
				Name:        "chat",
				DisplayName: "chat",
				Config:      ChannelConfig{Kind: ChannelKindGoogleChat, Spec: &ChannelGoogleChatConfig{WebhookURL: "https://chat.googleapis.com/v1/spaces/A/messages?key=k&token=t"}},
			},
			expectedDerivedType:   "googlechat",
			expectedConfigsInData: "googlechat_configs",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			receiver, err := testCase.postable.ToReceiver()
			require.NoError(t, err)
			require.Equal(t, testCase.postable.DisplayName, receiver.Name)

			channel, err := NewChannelFromReceiverWithName(receiver, testCase.postable.Name, "org-1")
			require.NoError(t, err)

			assert.Equal(t, testCase.expectedDerivedType, channel.Type)
			assert.Contains(t, channel.Data, testCase.expectedConfigsInData)
		})
	}
}

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
				Title:        "slack title",
				Text:         "slack text",
			},
			expectedRoundTrip: &ChannelSlackConfig{
				SendResolved: &sendResolved,
				APIURL:       "https://hooks.slack.com/services/T/B/X",
				Channel:      "#alerts",
				Title:        "slack title",
				Text:         "slack text",
			},
		},
		{
			description: "email",
			kind:        ChannelKindEmail,
			spec: &ChannelEmailConfig{
				SendResolved: &sendResolved,
				To:           "team@example.com",
				HTML:         "<p>email body</p>",
				Headers:      map[string]string{"Subject": "email subject"},
			},
			expectedRoundTrip: &ChannelEmailConfig{
				SendResolved: &sendResolved,
				To:           "team@example.com",
				HTML:         "<p>email body</p>",
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
				Source:       "pagerduty source",
				Client:       "pagerduty client",
				ClientURL:    "https://client.example.com",
				Description:  "pagerduty description",
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
				Source:       "pagerduty source",
				Client:       "pagerduty client",
				ClientURL:    "https://client.example.com",
				Description:  "pagerduty description",
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
				Message:      "opsgenie message",
				Description:  "opsgenie description",
				Source:       "opsgenie source",
				Priority:     "P1",
				Details:      map[string]string{"env": "prod"},
			},
			expectedRoundTrip: &ChannelOpsgenieConfig{
				SendResolved: &sendResolved,
				APIKey:       "api-key",
				APIURL:       "https://api.eu.opsgenie.com",
				Message:      "opsgenie message",
				Description:  "opsgenie description",
				Source:       "opsgenie source",
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
				Title:        "msteams title",
				Text:         "msteams text",
			},
			expectedRoundTrip: &ChannelMSTeamsConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://teams.example.com/hook",
				Title:        "msteams title",
				Text:         "msteams text",
			},
		},
		{
			description: "googlechat",
			kind:        ChannelKindGoogleChat,
			spec: &ChannelGoogleChatConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://chat.googleapis.com/v1/spaces/s/messages",
				Title:        "googlechat title",
				Text:         "googlechat text",
			},
			expectedRoundTrip: &ChannelGoogleChatConfig{
				SendResolved: &sendResolved,
				WebhookURL:   "https://chat.googleapis.com/v1/spaces/s/messages",
				Title:        "googlechat title",
				Text:         "googlechat text",
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

// Slack is the clearest case of defaults being injected on write: the caller
// sends no title or text and the stored channel comes back carrying upstream's
// templates. Clients that diff a read against their own input (Terraform) have
// to treat these as server-computed.
// send_resolved carries no omitempty, so a spec that leaves it unset would
// marshal an explicit false and overwrite the notifier's default. Four of the
// seven kinds default to true, which is what makes the difference visible.
func TestChannelSpecWithoutSendResolvedTakesTheUpstreamDefault(t *testing.T) {
	testCases := []struct {
		description  string
		spec         ChannelSpec
		expectedSend bool
	}{
		{"webhook", &ChannelWebhookConfig{URL: "https://example.com/hook"}, true},
		{"pagerduty", &ChannelPagerdutyConfig{RoutingKey: "routing-key"}, true},
		{"opsgenie", &ChannelOpsgenieConfig{APIKey: "api-key"}, true},
		{"msteams", &ChannelMSTeamsConfig{WebhookURL: "https://teams.example.com/hook"}, true},
		{"slack", &ChannelSlackConfig{APIURL: "https://hooks.slack.com/services/T/B/X"}, false},
		{"email", &ChannelEmailConfig{To: "team@example.com"}, false},
		{"googlechat", &ChannelGoogleChatConfig{WebhookURL: "https://chat.googleapis.com/v1/spaces/A/messages"}, false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			receiver, err := testCase.spec.toReceiver("probe")
			require.NoError(t, err)

			channel, err := NewChannelFromReceiverWithName(receiver, "probe", "org-1")
			require.NoError(t, err)

			roundTripped, err := channel.toPostableNotificationChannel()
			require.NoError(t, err)

			sendResolved := reflect.ValueOf(roundTripped.Config.Spec).Elem().FieldByName("SendResolved")
			require.False(t, sendResolved.IsNil(), "a read always reports send_resolved")
			assert.Equal(t, testCase.expectedSend, sendResolved.Elem().Bool())
		})
	}
}

func TestChannelToPostableChannelReturnsDefaultsTheCallerDidNotSet(t *testing.T) {
	postable := PostableNotificationChannel{
		Name:        "oncall",
		DisplayName: "oncall",
		Config: ChannelConfig{
			Kind: ChannelKindSlack,
			Spec: &ChannelSlackConfig{APIURL: "https://hooks.slack.com/services/T/B/X", Channel: "#alerts"},
		},
	}

	receiver, err := postable.ToReceiver()
	require.NoError(t, err)

	channel, err := NewChannelFromReceiverWithName(receiver, postable.Name, "org-1")
	require.NoError(t, err)

	roundTripped, err := channel.toPostableNotificationChannel()
	require.NoError(t, err)

	spec, ok := roundTripped.Config.Spec.(*ChannelSlackConfig)
	require.True(t, ok)
	assert.Equal(t, "#alerts", spec.Channel)
	assert.NotEmpty(t, spec.Title, "upstream's default title template is injected on write")
	assert.NotEmpty(t, spec.Text, "upstream's default text template is injected on write")
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

// rejectUnrepresentableHTTPConfig enumerates the members it rejects, so a field
// added upstream would pass unnoticed and be dropped on read. Pinning the counts
// turns a dependency bump into a failing test rather than silent data loss.
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
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			_, err := testCase.channel.toPostableNotificationChannel()
			assert.Error(t, err)
		})
	}
}
