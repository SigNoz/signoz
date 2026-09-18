package alertmanagertypes

import (
	"encoding/json"
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// one receiver touching every credential shape the walk has to catch: secret
// strings, secret URLs, http_config secrets, and the native config types.
const secretsReceiverJSON = `{
	"name": "many-secrets",
	"slack_configs": [{"api_url": "https://hooks.slack.com/services/T000/B000/realslacktoken", "channel": "#alerts"}, {"app_token": "xapp-real-token", "channel": "#alerts-token"}],
	"webhook_configs": [
		{"url": "https://example.com/hook?token=realtoken", "http_config": {"basic_auth": {"username": "u", "password": "real-password"}}},
		{"url": "https://example.com/hook2", "http_config": {"bearer_token": "real-bearer"}}
	],
	"pagerduty_configs": [{"routing_key": "real-routing-key"}, {"service_key": "real-service-key"}],
	"opsgenie_configs": [{"api_key": "real-opsgenie-key", "message": "hi"}],
	"telegram_configs": [{"token": "real-bot-token", "chat": 123}],
	"msteams_configs": [{"webhook_url": "https://example.webhook.office.com/webhookb2/realmsteams"}],
	"discord_configs": [{"webhook_url": "https://discord.com/api/webhooks/realdiscord"}],
	"webex_configs": [{"room_id": "room-1", "http_config": {"authorization": {"type": "Bearer", "credentials": "real-webex-token"}}}],
	"googlechat_configs": [{"webhook_url": "https://chat.googleapis.com/v1/spaces/AAA/messages?key=realgchat&token=realgchat"}],
	"jsmops_configs": [{"api_key": "real-jsm-key"}],
	"incidentio_configs": [{"url": "https://api.incident.io/v2/alert_events/http/01ABC", "token": "real-incidentio-token"}]
}`

func redactedData(t *testing.T, data string) map[string]any {
	t.Helper()
	channel := &Channel{DisplayName: "many-secrets", Data: data}
	redacted, err := channel.Redacted()
	require.NoError(t, err)
	var parsed map[string]any
	require.NoError(t, json.Unmarshal([]byte(redacted.Data), &parsed))
	return parsed
}

func firstConfig(t *testing.T, parsed map[string]any, key string, idx int) map[string]any {
	t.Helper()
	configs, ok := parsed[key].([]any)
	require.True(t, ok, "%s missing from redacted data", key)
	require.Greater(t, len(configs), idx)
	cfg, ok := configs[idx].(map[string]any)
	require.True(t, ok)
	return cfg
}

func TestChannelRedactedMasksEveryCredential(t *testing.T) {
	parsed := redactedData(t, secretsReceiverJSON)

	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "slack_configs", 0)["api_url"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "slack_configs", 1)["app_token"])

	webhook0 := firstConfig(t, parsed, "webhook_configs", 0)
	assert.Equal(t, RedactedSecretValue, webhook0["url"])
	assert.Equal(t, RedactedSecretValue, webhook0["http_config"].(map[string]any)["basic_auth"].(map[string]any)["password"])

	webhook1 := firstConfig(t, parsed, "webhook_configs", 1)
	assert.Equal(t, RedactedSecretValue, webhook1["url"])
	// bearer_token is legacy sugar; prometheus/common normalizes it into authorization.credentials
	assert.Equal(t, RedactedSecretValue, webhook1["http_config"].(map[string]any)["authorization"].(map[string]any)["credentials"])

	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "pagerduty_configs", 0)["routing_key"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "pagerduty_configs", 1)["service_key"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "opsgenie_configs", 0)["api_key"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "telegram_configs", 0)["token"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "msteams_configs", 0)["webhook_url"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "discord_configs", 0)["webhook_url"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "webex_configs", 0)["http_config"].(map[string]any)["authorization"].(map[string]any)["credentials"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "googlechat_configs", 0)["webhook_url"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "jsmops_configs", 0)["api_key"])
	assert.Equal(t, RedactedSecretValue, firstConfig(t, parsed, "incidentio_configs", 0)["token"])
}

func TestChannelRedactedKeepsNonSecretFields(t *testing.T) {
	parsed := redactedData(t, secretsReceiverJSON)

	assert.Equal(t, "many-secrets", parsed["name"])
	assert.Equal(t, "#alerts", firstConfig(t, parsed, "slack_configs", 0)["channel"])
	assert.Equal(t, "hi", firstConfig(t, parsed, "opsgenie_configs", 0)["message"])
	assert.Equal(t, "room-1", firstConfig(t, parsed, "webex_configs", 0)["room_id"])
	assert.Equal(t, "u", firstConfig(t, parsed, "webhook_configs", 0)["http_config"].(map[string]any)["basic_auth"].(map[string]any)["username"])
	// endpoint URLs that are not credential-typed stay readable
	assert.Equal(t, "https://api.incident.io/v2/alert_events/http/01ABC", firstConfig(t, parsed, "incidentio_configs", 0)["url"])
}

func TestChannelRedactedDoesNotMutateStoredChannel(t *testing.T) {
	channel := &Channel{DisplayName: "many-secrets", Data: secretsReceiverJSON}
	_, err := channel.Redacted()
	require.NoError(t, err)
	assert.Equal(t, secretsReceiverJSON, channel.Data)
}

func TestChannelRedactedLeavesEmptySecretsAlone(t *testing.T) {
	parsed := redactedData(t, `{"name": "plain", "slack_configs": [{"channel": "#alerts"}]}`)
	slack := firstConfig(t, parsed, "slack_configs", 0)
	_, hasAPIURL := slack["api_url"]
	assert.False(t, hasAPIURL)
	assert.Equal(t, "#alerts", slack["channel"])
}

func TestChannelRedactedRejectsCorruptData(t *testing.T) {
	channel := &Channel{DisplayName: "broken", Data: "not json"}
	_, err := channel.Redacted()
	assert.Error(t, err)
}

func TestRestoreRedactedSecretsRoundTrip(t *testing.T) {
	channel := &Channel{DisplayName: "many-secrets", Data: secretsReceiverJSON}
	stored, err := NewChannelFromReceiver(mustReceiver(t, secretsReceiverJSON), "org")
	require.NoError(t, err)

	redacted, err := channel.Redacted()
	require.NoError(t, err)

	restored, err := RestoreRedactedSecrets([]byte(redacted.Data), stored.Data)
	require.NoError(t, err)

	// the restored body must parse as a receiver again — the marker alone
	// would fail URL validation — and must carry the original secrets
	receiver, err := NewReceiver(string(restored))
	require.NoError(t, err)
	assert.Equal(t, "https://hooks.slack.com/services/T000/B000/realslacktoken", receiver.SlackConfigs[0].APIURL.String())
	assert.Equal(t, config.Secret("xapp-real-token"), receiver.SlackConfigs[1].AppToken)
	assert.Equal(t, config.SecretTemplateURL("https://example.com/hook?token=realtoken"), receiver.WebhookConfigs[0].URL)
	assert.Equal(t, "real-password", string(receiver.WebhookConfigs[0].HTTPConfig.BasicAuth.Password))
	assert.Equal(t, "real-bearer", string(receiver.WebhookConfigs[1].HTTPConfig.Authorization.Credentials))
	assert.Equal(t, config.Secret("real-routing-key"), receiver.PagerdutyConfigs[0].RoutingKey)
	assert.Equal(t, config.Secret("real-service-key"), receiver.PagerdutyConfigs[1].ServiceKey)
	assert.Equal(t, config.Secret("real-opsgenie-key"), receiver.OpsGenieConfigs[0].APIKey)
	assert.Equal(t, config.Secret("real-bot-token"), receiver.TelegramConfigs[0].BotToken)
	assert.Equal(t, "https://example.webhook.office.com/webhookb2/realmsteams", receiver.MSTeamsConfigs[0].WebhookURL.String())
	assert.Equal(t, "https://discord.com/api/webhooks/realdiscord", receiver.DiscordConfigs[0].WebhookURL.String())
	assert.Equal(t, "real-webex-token", string(receiver.WebexConfigs[0].HTTPConfig.Authorization.Credentials))
	assert.Equal(t, "https://chat.googleapis.com/v1/spaces/AAA/messages?key=realgchat&token=realgchat", receiver.GoogleChatConfigs[0].WebhookURL.String())
	assert.Equal(t, config.Secret("real-jsm-key"), receiver.JSMOpsConfigs[0].APIKey)
	assert.Equal(t, config.Secret("real-incidentio-token"), receiver.IncidentIOConfigs[0].Token)
}

func TestRestoreRedactedSecretsWithoutMarkerPassesThrough(t *testing.T) {
	stored := `{"name": "s", "slack_configs": [{"api_url": "https://hooks.slack.com/services/T/B/real", "channel": "#a"}]}`
	incoming := `{"name": "s", "slack_configs": [{"api_url": "https://hooks.slack.com/services/T/B/other", "channel": "#a"}]}`
	restored, err := RestoreRedactedSecrets([]byte(incoming), stored)
	require.NoError(t, err)
	receiver, err := NewReceiver(string(restored))
	require.NoError(t, err)
	assert.Equal(t, "https://hooks.slack.com/services/T/B/other", receiver.SlackConfigs[0].APIURL.String())
}

func TestRestoreRedactedSecretsKeepsNewConfigsUntouched(t *testing.T) {
	stored := `{"name": "s", "webhook_configs": [{"url": "https://example.com/real"}]}`
	incoming := `{"name": "s", "webhook_configs": [{"url": "<secret>"}, {"url": "https://example.com/brand-new"}]}`
	restored, err := RestoreRedactedSecrets([]byte(incoming), stored)
	require.NoError(t, err)
	receiver, err := NewReceiver(string(restored))
	require.NoError(t, err)
	assert.Equal(t, "https://example.com/real", string(receiver.WebhookConfigs[0].URL))
	assert.Equal(t, "https://example.com/brand-new", string(receiver.WebhookConfigs[1].URL))
}

func TestRestoreRedactedSecretsRejectsMarkerWithoutStoredSecret(t *testing.T) {
	stored := `{"name": "s", "slack_configs": [{"channel": "#a"}]}`
	incoming := `{"name": "s", "slack_configs": [{"api_url": "<secret>", "channel": "#a"}]}`
	_, err := RestoreRedactedSecrets([]byte(incoming), stored)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "slack_configs.0.api_url")
}

func TestRestoreRedactedSecretsRejectsCorruptStoredData(t *testing.T) {
	_, err := RestoreRedactedSecrets([]byte(`{"name": "s"}`), "not json")
	assert.Error(t, err)
}

func TestRestoreRedactedSecretsRejectsCorruptIncomingBody(t *testing.T) {
	stored := `{"name": "s", "slack_configs": [{"api_url": "https://hooks.slack.com/services/T/B/real", "channel": "#a"}]}`
	_, err := RestoreRedactedSecrets([]byte("not json"), stored)
	assert.Error(t, err)
}

func TestHasRedactedSecretMarker(t *testing.T) {
	assert.True(t, HasRedactedSecretMarker([]byte(`{"url": "<secret>"}`)))
	assert.True(t, HasRedactedSecretMarker([]byte(`{"url": "\u003csecret\u003e"}`)))
	assert.False(t, HasRedactedSecretMarker([]byte(`{"url": "https://example.com/<secret-ish>"}`)))
	assert.False(t, HasRedactedSecretMarker([]byte(`{"url": "https://example.com"}`)))
}

func mustReceiver(t *testing.T, data string) *Receiver {
	t.Helper()
	receiver, err := NewReceiver(data)
	require.NoError(t, err)
	return receiver
}
