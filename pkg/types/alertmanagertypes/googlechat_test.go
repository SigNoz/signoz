package alertmanagertypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewReceiverGoogleChatWebhookURL(t *testing.T) {
	cases := []struct {
		name    string
		config  string
		wantErr bool
	}{
		{"valid", `{"name":"gc","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t"}]}`, false},
		{"http scheme rejected", `{"name":"gc","googlechat_configs":[{"webhook_url":"http://chat.googleapis.com/v1/spaces/x/messages"}]}`, true},
		{"wrong host rejected", `{"name":"gc","googlechat_configs":[{"webhook_url":"https://example.com/x"}]}`, true},
		{"missing webhook_url", `{"name":"gc","googlechat_configs":[{"title":"x"}]}`, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := NewReceiver(c.config)
			if c.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
