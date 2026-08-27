package alertmanagertypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewReceiverGotifyURLAndToken(t *testing.T) {
	cases := []struct {
		name    string
		config  string
		wantErr bool
	}{
		{"valid", `{"name":"gt","gotify_configs":[{"url":"https://gotify.example.com","token":"secrettoken"}]}`, false},
		{"valid http", `{"name":"gt","gotify_configs":[{"url":"http://gotify.example.com","token":"secrettoken"}]}`, false},
		{"missing token", `{"name":"gt","gotify_configs":[{"url":"https://gotify.example.com"}]}`, true},
		{"missing url", `{"name":"gt","gotify_configs":[{"token":"secrettoken"}]}`, true},
		{"invalid scheme", `{"name":"gt","gotify_configs":[{"url":"ftp://gotify.example.com","token":"secrettoken"}]}`, true},
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
