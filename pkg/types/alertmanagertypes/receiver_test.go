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
