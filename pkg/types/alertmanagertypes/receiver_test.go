package alertmanagertypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewReceiver(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
		pass     bool
	}{
		{
			name:     "TelegramConfig",
			input:    `{"name":"telegram","telegram_configs":[{"chat":12345,"token":"1234567890"}]}`,
			expected: `{"name":"telegram","telegram_configs":[{"send_resolved":false,"token":"1234567890","chat":12345,"message":"{{ template \"telegram.default.message\" . }}","parse_mode":"HTML"}]}`,
			pass:     true,
		},
		{
			name:     "GoogleChatConfig",
			input:    `{"name":"googlechat","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"Alert","text":"Body"}]}`,
			expected: `{"name":"googlechat","googlechat_configs":[{"send_resolved":false,"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"Alert","text":"Body"}]}`,
			pass:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			receiver, err := NewReceiver(tc.input)
			if tc.pass {
				assert.NoError(t, err)

				bytes, err := json.Marshal(receiver)
				require.NoError(t, err)
				assert.Equal(t, tc.expected, string(bytes))
				return
			}

			assert.Error(t, err)
		})
	}
}

func TestNewReceiverStripsEmailTransport(t *testing.T) {
	receiver, err := NewReceiver(`{"name":"email","email_configs":[{"to":"team@example.com","from":"attacker@example.com","hello":"example.com","smarthost":"smtp.example.com:587","auth_username":"user","auth_password":"supersecret","auth_secret":"alsosecret","auth_identity":"id","require_tls":false,"headers":{"Subject":"custom"}}]}`)
	require.NoError(t, err)
	require.Len(t, receiver.EmailConfigs, 1)

	got := receiver.EmailConfigs[0]
	assert.Equal(t, "team@example.com", got.To)
	assert.Equal(t, map[string]string{"Subject": "custom"}, got.Headers)

	assert.Empty(t, got.From)
	assert.Empty(t, got.Hello)
	assert.Empty(t, got.Smarthost.String())
	assert.Empty(t, got.AuthUsername)
	assert.Empty(t, string(got.AuthPassword))
	assert.Empty(t, string(got.AuthSecret))
	assert.Empty(t, got.AuthIdentity)
	assert.Nil(t, got.RequireTLS)
	assert.Nil(t, got.TLSConfig)

	bytes, err := json.Marshal(receiver)
	require.NoError(t, err)
	assert.NotContains(t, string(bytes), "supersecret")
	assert.NotContains(t, string(bytes), "smtp.example.com")
}

// Omitted fields fall back to DefaultGoogleChatReceiverConfig.
func TestNewReceiverGoogleChatAppliesDefaults(t *testing.T) {
	receiver, err := NewReceiver(`{"name":"googlechat","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages"}]}`)
	require.NoError(t, err)
	require.Len(t, receiver.GoogleChatConfigs, 1)

	got := receiver.GoogleChatConfigs[0]
	assert.Equal(t, DefaultGoogleChatReceiverConfig.Title, got.Title, "Title should fall back to the default template")
	assert.Equal(t, DefaultGoogleChatReceiverConfig.Text, got.Text, "Text should fall back to the default template")
	assert.Equal(t, DefaultGoogleChatReceiverConfig.VSendResolved, got.SendResolved(), "send_resolved should fall back to the default")
}

// User-specified values override defaults.
func TestNewReceiverGoogleChatPreservesUserOverrides(t *testing.T) {
	receiver, err := NewReceiver(`{"name":"googlechat","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"X","text":"Y","send_resolved":true}]}`)
	require.NoError(t, err)
	require.Len(t, receiver.GoogleChatConfigs, 1)

	got := receiver.GoogleChatConfigs[0]
	assert.Equal(t, "X", got.Title)
	assert.Equal(t, "Y", got.Text)
	assert.True(t, got.SendResolved())
}
