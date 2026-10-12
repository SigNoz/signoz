package alertmanagertypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChannelWebhookConfigBodyTemplateValidation(t *testing.T) {
	t.Run("valid body template is accepted", func(t *testing.T) {
		var c ChannelWebhookConfig
		err := json.Unmarshal([]byte(`{"url": "https://example.com/hook", "bodyTemplate": "{\"text\": \"{{ .CommonLabels.alertname }}\"}"}`), &c)
		require.NoError(t, err)
		assert.Equal(t, `{"text": "{{ .CommonLabels.alertname }}"}`, c.BodyTemplate)
	})

	t.Run("empty body template is accepted", func(t *testing.T) {
		var c ChannelWebhookConfig
		err := json.Unmarshal([]byte(`{"url": "https://example.com/hook"}`), &c)
		require.NoError(t, err)
		assert.Equal(t, "", c.BodyTemplate)
	})

	t.Run("invalid body template is rejected", func(t *testing.T) {
		var c ChannelWebhookConfig
		err := json.Unmarshal([]byte(`{"url": "https://example.com/hook", "bodyTemplate": "{{ .Unclosed"}`), &c)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "bodyTemplate")
	})

	t.Run("body template alongside other fields", func(t *testing.T) {
		var c ChannelWebhookConfig
		err := json.Unmarshal([]byte(`{"url": "https://example.com/hook", "bearerToken": "s3cret", "bodyTemplate": "{\"text\": \"hi\"}"}`), &c)
		require.NoError(t, err)
		assert.Equal(t, `{"text": "hi"}`, c.BodyTemplate)
		assert.Equal(t, "s3cret", c.BearerToken)
	})
}

func TestChannelWebhookConfigBodyTemplateReceiverRoundTrip(t *testing.T) {
	original := ChannelWebhookConfig{
		URL:          "https://example.com/hook",
		BodyTemplate: `{"text": "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"}`,
	}

	receiver, err := original.toUndefaultedReceiver("test-webhook")
	require.NoError(t, err)
	require.Len(t, receiver.WebhookConfigs, 1)
	require.Len(t, receiver.WebhookBodyTemplates, 1)
	assert.Equal(t, original.BodyTemplate, receiver.WebhookBodyTemplates[0])

	// Simulate Channel.Data persistence: the receiver is marshalled to JSON
	// when the channel is stored and unmarshalled back when read.
	raw, err := json.Marshal(receiver)
	require.NoError(t, err)

	restored := &Receiver{}
	require.NoError(t, json.Unmarshal(raw, restored))
	require.Len(t, restored.WebhookConfigs, 1)
	require.Len(t, restored.WebhookBodyTemplates, 1)

	spec, err := newChannelWebhookConfigFromReceiver("test-webhook", restored)
	require.NoError(t, err)
	webhookSpec, ok := spec.(*ChannelWebhookConfig)
	require.True(t, ok, "expected *ChannelWebhookConfig, got %T", spec)
	assert.Equal(t, original.BodyTemplate, webhookSpec.BodyTemplate)
	assert.Equal(t, original.URL, webhookSpec.URL)
}

func TestChannelWebhookConfigWithoutBodyTemplateRoundTrip(t *testing.T) {
	// Channels created before bodyTemplate existed must keep working and
	// report an empty template.
	original := ChannelWebhookConfig{URL: "https://example.com/hook"}

	receiver, err := original.toUndefaultedReceiver("test-webhook")
	require.NoError(t, err)

	raw, err := json.Marshal(receiver)
	require.NoError(t, err)

	restored := &Receiver{}
	require.NoError(t, json.Unmarshal(raw, restored))

	spec, err := newChannelWebhookConfigFromReceiver("test-webhook", restored)
	require.NoError(t, err)
	webhookSpec, ok := spec.(*ChannelWebhookConfig)
	require.True(t, ok, "expected *ChannelWebhookConfig, got %T", spec)
	assert.Equal(t, "", webhookSpec.BodyTemplate)
}
