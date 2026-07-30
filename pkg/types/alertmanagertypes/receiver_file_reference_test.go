package alertmanagertypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReceiverValidateFileReferences(t *testing.T) {
	testCases := []struct {
		name  string
		input string
		pass  bool
	}{
		{
			name:  "WebhookWithInlinePassword",
			input: `{"name":"webhook","webhook_configs":[{"url":"https://example.com/hook","http_config":{"basic_auth":{"username":"u","password":"p"}}}]}`,
			pass:  true,
		},
		{
			name:  "SlackWithInlineAPIURL",
			input: `{"name":"slack","slack_configs":[{"api_url":"https://hooks.slack.com/services/T/B/X","channel":"#alerts"}]}`,
			pass:  true,
		},
		{
			name:  "WebhookWithPasswordFile",
			input: `{"name":"webhook","webhook_configs":[{"url":"https://example.com/hook","http_config":{"basic_auth":{"username":"u","password_file":"/proc/self/environ"}}}]}`,
			pass:  false,
		},
		{
			name:  "WebhookWithCredentialsFile",
			input: `{"name":"webhook","webhook_configs":[{"url":"https://example.com/hook","http_config":{"authorization":{"type":"Bearer","credentials_file":"/etc/passwd"}}}]}`,
			pass:  false,
		},
		{
			name:  "WebhookWithTLSCAFile",
			input: `{"name":"webhook","webhook_configs":[{"url":"https://example.com/hook","http_config":{"tls_config":{"ca_file":"/etc/passwd"}}}]}`,
			pass:  false,
		},
		{
			name:  "OpsgenieWithAPIKeyFile",
			input: `{"name":"opsgenie","opsgenie_configs":[{"api_key_file":"/etc/passwd"}]}`,
			pass:  false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			receiver, err := NewReceiver(tc.input)
			require.NoError(t, err)

			err = receiver.ValidateFileReferences()
			if tc.pass {
				assert.NoError(t, err)
				return
			}

			assert.Error(t, err)
		})
	}
}
