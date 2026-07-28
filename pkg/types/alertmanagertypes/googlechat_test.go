package alertmanagertypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateGoogleChatWebhookURL(t *testing.T) {
	cases := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"valid", "https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t", false},
		{"http scheme rejected", "http://chat.googleapis.com/v1/spaces/AAA/messages", true},
		{"wrong host rejected", "https://example.com/v1/spaces/AAA/messages", true},
		{"empty rejected", "", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateGoogleChatWebhookURL(c.url)
			if c.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestNewReceiverGoogleChatRejectsBadURL(t *testing.T) {
	// http scheme
	_, err := NewReceiver(`{"name":"gc","googlechat_configs":[{"webhook_url":"http://chat.googleapis.com/v1/spaces/x/messages"}]}`)
	require.Error(t, err)

	// wrong host
	_, err = NewReceiver(`{"name":"gc","googlechat_configs":[{"webhook_url":"https://example.com/x"}]}`)
	require.Error(t, err)

	// missing webhook_url
	_, err = NewReceiver(`{"name":"gc","googlechat_configs":[{"title":"x"}]}`)
	require.Error(t, err)
}
