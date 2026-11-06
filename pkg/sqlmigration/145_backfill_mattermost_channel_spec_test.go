package sqlmigration

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMattermostChannelSpecFromReceiverJSON(t *testing.T) {
	testCases := []struct {
		name     string
		data     string
		wantKind string
		wantSpec map[string]any
		wantErr  bool
	}{
		{
			name:     "EveryModelledField",
			data:     `{"name":"mm","mattermost_configs":[{"send_resolved":true,"webhook_url":"https://mattermost.example.com/hooks/abc","channel":"alerts","username":"signoz","icon_url":"https://signoz.io/i.png","icon_emoji":":bell:","text":"hi"}]}`,
			wantKind: "mattermost",
			wantSpec: map[string]any{"sendResolved": true, "webhookUrl": "https://mattermost.example.com/hooks/abc", "channel": "alerts", "username": "signoz", "iconUrl": "https://signoz.io/i.png", "iconEmoji": ":bell:", "text": "hi"},
		},
		{
			name:     "EmptyTextLeftUnset",
			data:     `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc"}]}`,
			wantKind: "mattermost",
			wantSpec: map[string]any{"sendResolved": false, "webhookUrl": "https://mattermost.example.com/hooks/abc", "channel": "", "username": "", "iconUrl": "", "iconEmoji": ""},
		},
		{name: "OtherKind_Skipped", data: `{"name":"s","slack_configs":[{"api_url":"https://hooks.slack.com/x"}]}`},
		{name: "WebhookURLFile_Rejected", data: `{"name":"mm","mattermost_configs":[{"webhook_url_file":"/etc/hook"}]}`, wantKind: "mattermost", wantErr: true},
		{name: "Attachments_Rejected", data: `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","attachments":[{"text":"x"}]}]}`, wantKind: "mattermost", wantErr: true},
		{name: "Priority_Rejected", data: `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","priority":{"priority":"urgent"}}]}`, wantKind: "mattermost", wantErr: true},
		{name: "BasicAuth_Rejected", data: `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","http_config":{"basic_auth":{"username":"u"}}}]}`, wantKind: "mattermost", wantErr: true},
		{name: "TwoNotifiers_Rejected", data: `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc"}],"slack_configs":[{"api_url":"https://hooks.slack.com/x"}]}`, wantKind: "mattermost", wantErr: true},
		{name: "MissingWebhookURL_Rejected", data: `{"name":"mm","mattermost_configs":[{"channel":"alerts"}]}`, wantKind: "mattermost", wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			kind, spec, err := mattermostChannelSpecFromReceiverJSON(testCase.data)
			assert.Equal(t, testCase.wantKind, kind)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.wantSpec, spec)
		})
	}
}
