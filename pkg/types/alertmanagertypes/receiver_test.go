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
			input:    `{"name":"googlechat","googlechat_configs":[{"send_resolved":true,"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"Alert","text":"Body"}]}`,
			expected: `{"name":"googlechat","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"Alert","text":"Body","send_resolved":true}]}`,
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
				assert.JSONEq(t, tc.expected, string(bytes))
				return
			}

			assert.Error(t, err)
		})
	}
}
