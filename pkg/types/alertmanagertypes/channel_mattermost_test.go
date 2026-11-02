package alertmanagertypes

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChannelMattermostConfigDefaults(t *testing.T) {
	var spec ChannelMattermostConfig
	require.NoError(t, json.Unmarshal([]byte(`{"webhookUrl":"https://mattermost.example.com/hooks/abc"}`), &spec))

	require.NotNil(t, spec.SendResolved)
	assert.True(t, *spec.SendResolved, "upstream defaults mattermost send_resolved on")
	assert.Equal(t, config.DefaultMattermostConfig.Text, spec.Text.StringValue())
}

func TestChannelMattermostConfigValidation(t *testing.T) {
	testCases := []struct {
		name string
		spec string
	}{
		{"WebhookURL_Missing", `{"channel":"alerts"}`},
		{"WebhookURLFile_NotAField", `{"webhookUrl":"https://mattermost.example.com/hooks/abc","webhookUrlFile":"/etc/hook"}`},
		{"Attachments_NotAField", `{"webhookUrl":"https://mattermost.example.com/hooks/abc","attachments":[]}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var spec ChannelMattermostConfig
			assert.Error(t, json.Unmarshal([]byte(testCase.spec), &spec))
		})
	}
}

// Settings the spec cannot represent would be dropped on read and silently
// rewrite the channel on the next write, so the read fails instead.
func TestDeriveChannelConfigRejectsUnsupportedMattermostSettings(t *testing.T) {
	testCases := []struct {
		name string
		data string
	}{
		{"WebhookURLFile", `{"name":"mm","mattermost_configs":[{"webhook_url_file":"/etc/hook"}]}`},
		{"Attachments", `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","attachments":[{"text":"x"}]}]}`},
		{"Priority", `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","priority":{"priority":"urgent"}}]}`},
		{"Props", `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","props":{"card":"x"}}]}`},
		{"Type", `{"name":"mm","mattermost_configs":[{"webhook_url":"https://mattermost.example.com/hooks/abc","type":"custom_x"}]}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			channel := Channel{DisplayName: "mm", Data: testCase.data}
			_, err := channel.deriveChannelConfig()
			assert.Error(t, err)
		})
	}
}

// HTTPConfig is filled from the global rather than the spec, and the notifier
// refuses to start without it.
func TestMattermostResolvesTheGlobalHTTPConfig(t *testing.T) {
	cfg, err := NewDefaultConfig(GlobalConfig{}, RouteConfig{GroupInterval: 1 * time.Minute, GroupWait: 1 * time.Minute, RepeatInterval: 1 * time.Minute}, "org-1")
	require.NoError(t, err)
	require.NoError(t, cfg.SetGlobalConfig(GlobalConfig{}))

	spec := ChannelMattermostConfig{WebhookURL: "https://mattermost.example.com/hooks/abc"}
	receiver, err := spec.toUndefaultedReceiver("mm")
	require.NoError(t, err)
	require.NoError(t, cfg.CreateReceiver(receiver))

	resolved, err := cfg.Resolved()
	require.NoError(t, err)

	resolvedReceiver, err := resolved.GetReceiver("mm")
	require.NoError(t, err)
	require.Len(t, resolvedReceiver.MattermostConfigs, 1)
	assert.NotNil(t, resolvedReceiver.MattermostConfigs[0].HTTPConfig)
	assert.Equal(t, "https://mattermost.example.com/hooks/abc", resolvedReceiver.MattermostConfigs[0].WebhookURL.String())
}
