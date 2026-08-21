package alertmanagertypes

import (
	"testing"

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

			channel, err := NewChannelFromReceiverWithInternalName(receiver, testCase.postable.Name, "org-1")
			require.NoError(t, err)

			assert.Equal(t, testCase.expectedDerivedType, channel.Type)
			assert.Contains(t, channel.Data, testCase.expectedConfigsInData)
		})
	}
}

// The spec types and the wire types they translate through carry the same field
// sets, and nothing but this couples them: a field missing from a wire type, or
// from either direction of its mapping, is silently dropped. Every field is set
// so no default can fill the gap and hide it, and the whole spec is compared so
// a dropped field fails rather than going unasserted. Webhook is covered by
// TestPostableChannelToReceiverRoundTripsWebhookAuthModes, whose auth modes are
// mutually exclusive and so cannot all be set at once.
func TestChannelToPostableChannelRoundTripsEveryFieldOfEveryKind(t *testing.T) {
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
				SendResolved: true,
				APIURL:       "https://hooks.slack.com/services/T/B/X",
				Channel:      "#alerts",
				Title:        "slack title",
				Text:         "slack text",
			},
			expectedRoundTrip: &ChannelSlackConfig{
				SendResolved: true,
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
				SendResolved: true,
				To:           "team@example.com",
				HTML:         "<p>email body</p>",
				Headers:      map[string]string{"Subject": "email subject"},
			},
			expectedRoundTrip: &ChannelEmailConfig{
				SendResolved: true,
				To:           "team@example.com",
				HTML:         "<p>email body</p>",
				Headers:      map[string]string{"Subject": "email subject"},
			},
		},
		{
			description: "pagerduty",
			kind:        ChannelKindPagerduty,
			spec: &ChannelPagerdutyConfig{
				SendResolved: true,
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
				SendResolved: true,
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
				SendResolved: true,
				APIKey:       "api-key",
				APIURL:       "https://api.eu.opsgenie.com",
				Message:      "opsgenie message",
				Description:  "opsgenie description",
				Source:       "opsgenie source",
				Priority:     "P1",
				Details:      map[string]string{"env": "prod"},
			},
			expectedRoundTrip: &ChannelOpsgenieConfig{
				SendResolved: true,
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
				SendResolved: true,
				WebhookURL:   "https://teams.example.com/hook",
				Title:        "msteams title",
				Text:         "msteams text",
			},
			expectedRoundTrip: &ChannelMSTeamsConfig{
				SendResolved: true,
				WebhookURL:   "https://teams.example.com/hook",
				Title:        "msteams title",
				Text:         "msteams text",
			},
		},
		{
			description: "googlechat",
			kind:        ChannelKindGoogleChat,
			spec: &ChannelGoogleChatConfig{
				SendResolved: true,
				WebhookURL:   "https://chat.googleapis.com/v1/spaces/s/messages",
				Title:        "googlechat title",
				Text:         "googlechat text",
			},
			expectedRoundTrip: &ChannelGoogleChatConfig{
				SendResolved: true,
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

			channel, err := NewChannelFromReceiverWithInternalName(receiver, postable.Name, "org-1")
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

	channel, err := NewChannelFromReceiverWithInternalName(receiver, postable.Name, "org-1")
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

	channel, err := NewChannelFromReceiverWithInternalName(receiver, postable.Name, "org-1")
	require.NoError(t, err)

	for _, credentialKey := range []string{"auth_username", "auth_password", "auth_secret", "tls_config"} {
		assert.NotContains(t, channel.Data, credentialKey)
	}

	assert.Contains(t, channel.Data, `"smarthost":""`)
}

// The UI offers basic auth and bearer token for webhooks, so both must survive a
// round trip. The legacy API overloaded one password field for both.
func TestPostableChannelToReceiverRoundTripsWebhookAuthModes(t *testing.T) {
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
			expectedRoundTrip: &ChannelWebhookConfig{URL: "https://example.com/hook", Username: "u", Password: "p"},
		},
		{
			description:       "bearer token",
			spec:              ChannelWebhookConfig{URL: "https://example.com/hook", BearerToken: "tok"},
			expectedInData:    `"authorization"`,
			expectedRoundTrip: &ChannelWebhookConfig{URL: "https://example.com/hook", BearerToken: "tok"},
		},
		{
			description:       "no auth",
			spec:              ChannelWebhookConfig{URL: "https://example.com/hook"},
			expectedInData:    `"url"`,
			expectedRoundTrip: &ChannelWebhookConfig{URL: "https://example.com/hook"},
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

			channel, err := NewChannelFromReceiverWithInternalName(receiver, postable.Name, "org-1")
			require.NoError(t, err)
			assert.Contains(t, channel.Data, testCase.expectedInData)

			roundTripped, err := channel.toPostableNotificationChannel()
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedRoundTrip, roundTripped.Config.Spec)
		})
	}
}

func TestChannelToPostableChannelRejectsUnrepresentableChannels(t *testing.T) {
	testCases := []struct {
		description string
		channel     Channel
	}{
		{
			description: "two notifier kinds in one channel",
			channel: Channel{
				Name: "mixed",
				Data: `{"name":"mixed","slack_configs":[{"channel":"#a"}],"email_configs":[{"to":"a@b.c"}]}`,
			},
		},
		{
			// Only the first would survive the read, and the second would be
			// dropped on the next write.
			description: "two configs of the same notifier kind",
			channel: Channel{
				Name: "two-slacks",
				Data: `{"name":"two-slacks","slack_configs":[{"channel":"#a"},{"channel":"#b"}]}`,
			},
		},
		{
			description: "no notifier configuration",
			channel: Channel{
				Name: "empty",
				Data: `{"name":"empty"}`,
			},
		},
		{
			description: "notifier kind outside the supported set",
			channel: Channel{
				Name: "tg",
				Data: `{"name":"tg","telegram_configs":[{"chat_id":1}]}`,
			},
		},
		{
			description: "legacy msteams v1 configs",
			channel: Channel{
				Name: "old-teams",
				Data: `{"name":"old-teams","msteams_configs":[{"webhook_url":"https://a"}]}`,
			},
		},
		{
			// Dropping these on read would unauthenticate the channel on the
			// next write, so the read fails instead.
			description: "webhook http_config beyond basic auth and bearer token",
			channel: Channel{
				Name: "proxied",
				Data: `{"name":"proxied","webhook_configs":[{"url":"https://a","http_config":{"proxy_url":"https://proxy","tls_config":{"insecure_skip_verify":true}}}]}`,
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
