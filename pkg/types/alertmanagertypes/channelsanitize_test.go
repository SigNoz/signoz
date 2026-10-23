package alertmanagertypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testSlackWebhookURL   = "https://hooks.slack.com/services/T00000000/B00000000/SECRET_SLACK_WEBHOOK"
	testWebhookURL        = "https://hooks.example.com/services/SECRET_WEBHOOK_TOKEN"
	testBasicAuthPassword = "s3cr3t-basic-auth-password"
	testBearerToken       = "SECRET-BEARER-TOKEN-VALUE"
)

func testSlackChannel() *Channel {
	return &Channel{
		DisplayName: "test-slack",
		Type:        ChannelKindSlack.StringValue(),
		Data: `{"name":"test-slack","slack_configs":[` +
			`{"send_resolved":true,"api_url":"` + testSlackWebhookURL + `",` +
			`"channel":"#alerts","text":"firing alert"}]}`,
		OrgID: "org-1",
	}
}

func testWebhookChannel() *Channel {
	return &Channel{
		DisplayName: "test-webhook",
		Type:        ChannelKindWebhook.StringValue(),
		Data: `{"name":"test-webhook","webhook_configs":[` +
			`{"send_resolved":true,"url":"` + testWebhookURL + `",` +
			`"http_config":{"basic_auth":{"username":"svc-user","password":"` + testBasicAuthPassword + `"},` +
			`"authorization":{"type":"Bearer","credentials":"` + testBearerToken + `"}}}]}`,
		OrgID: "org-1",
	}
}

func TestWithSecretsRedacted_RedactsV1ReceiverCredentials(t *testing.T) {
	tests := []struct {
		name       string
		channel    *Channel
		secrets    []string
		nonSecrets []string
	}{
		{
			name:       "slack",
			channel:    testSlackChannel(),
			secrets:    []string{testSlackWebhookURL},
			nonSecrets: []string{"test-slack", "#alerts", "firing alert"},
		},
		{
			name:       "webhook",
			channel:    testWebhookChannel(),
			secrets:    []string{testWebhookURL, testBasicAuthPassword, testBearerToken},
			nonSecrets: []string{"test-webhook", "svc-user"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			redacted := tt.channel.WithSecretsRedacted()

			require.NotSame(t, tt.channel, redacted, "must return a copy, not mutate the stored channel")
			for _, secret := range tt.secrets {
				assert.NotContains(t, redacted.Data, secret)
			}
			assert.Contains(t, redacted.Data, RedactedSecretValue)

			// Non-secret configuration must survive redaction.
			for _, nonSecret := range tt.nonSecrets {
				assert.Contains(t, redacted.Data, nonSecret)
			}

			// The stored channel must be untouched.
			for _, secret := range tt.secrets {
				assert.Contains(t, tt.channel.Data, secret, "redaction must not mutate the stored channel")
			}
		})
	}
}

func TestWithSecretsRedacted_LeavesNonSecretChannelsAlone(t *testing.T) {
	channel := &Channel{
		DisplayName: "plain",
		Type:        ChannelKindSlack.StringValue(),
		Data:        `{"name":"plain","slack_configs":[{"api_url":"` + RedactedSecretValue + `","channel":"#alerts"}]}`,
		OrgID:       "org-1",
	}

	redacted := channel.WithSecretsRedacted()
	assert.Equal(t, channel.Data, redacted.Data, "already-redacted data must round-trip unchanged")
}

func TestWithSecretsRedacted_MalformedDataIsNotLeaked(t *testing.T) {
	channel := &Channel{
		DisplayName: "broken",
		Data:        `{"name":"broken","webhook_configs":[{"url":"https://x/` + testWebhookURL,
		OrgID:       "org-1",
	}
	redacted := channel.WithSecretsRedacted()
	assert.NotContains(t, redacted.Data, testWebhookURL, "unparseable stored data must not be returned verbatim")
}

func TestGettableNotificationChannelWithSecretsRedacted(t *testing.T) {
	t.Run("basic auth", func(t *testing.T) {
		gettable := &GettableNotificationChannel{
			Name:        "webhook-1",
			DisplayName: "webhook-1",
			Config: ChannelConfig{
				Kind: ChannelKindWebhook,
				Spec: &ChannelWebhookConfig{
					URL:      testWebhookURL,
					Username: "svc-user",
					Password: testBasicAuthPassword,
				},
			},
		}

		redacted, err := gettable.WithSecretsRedacted()
		require.NoError(t, err)

		spec, ok := redacted.Config.Spec.(*ChannelWebhookConfig)
		require.True(t, ok, "spec type must survive redaction")
		assert.Equal(t, RedactedSecretValue, spec.URL)
		assert.Equal(t, RedactedSecretValue, spec.Password)
		assert.Equal(t, "svc-user", spec.Username, "non-secret fields must survive")
		assert.Equal(t, ChannelKindWebhook, redacted.Config.Kind)

		// The source must be untouched.
		orig, ok := gettable.Config.Spec.(*ChannelWebhookConfig)
		require.True(t, ok)
		assert.Equal(t, testBasicAuthPassword, orig.Password, "redaction must not mutate the source spec")
	})

	t.Run("bearer token", func(t *testing.T) {
		gettable := &GettableNotificationChannel{
			Name:        "webhook-2",
			DisplayName: "webhook-2",
			Config: ChannelConfig{
				Kind: ChannelKindWebhook,
				Spec: &ChannelWebhookConfig{
					URL:         testWebhookURL,
					BearerToken: testBearerToken,
				},
			},
		}

		redacted, err := gettable.WithSecretsRedacted()
		require.NoError(t, err)

		spec, ok := redacted.Config.Spec.(*ChannelWebhookConfig)
		require.True(t, ok, "spec type must survive redaction")
		assert.Equal(t, RedactedSecretValue, spec.BearerToken)
	})
}
