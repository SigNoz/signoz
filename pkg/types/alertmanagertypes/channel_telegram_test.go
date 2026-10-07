package alertmanagertypes

import (
	"encoding/json"
	"net/url"
	"testing"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChannelTelegramConfigDefaults(t *testing.T) {
	var spec ChannelTelegramConfig
	require.NoError(t, json.Unmarshal([]byte(`{"botToken":"123456:tok","chatId":-1001234567890}`), &spec))

	require.NotNil(t, spec.SendResolved)
	assert.True(t, *spec.SendResolved, "upstream defaults telegram send_resolved on")
	assert.Equal(t, DefaultTelegramMessageTemplate, spec.Message.StringValue())
	assert.Equal(t, config.DefaultTelegramConfig.ParseMode, spec.ParseMode)
	assert.Empty(t, spec.APIURL, "the global telegram_api_url applies when none is given")
}

func TestChannelTelegramConfigValidation(t *testing.T) {
	testCases := []struct {
		name string
		spec string
	}{
		{"BotToken_Missing", `{"chatId":1}`},
		{"ChatID_Missing", `{"botToken":"123456:tok"}`},
		{"ChatID_Username_Rejected", `{"botToken":"123456:tok","chatId":"@signoz"}`},
		{"ParseMode_Unknown", `{"botToken":"123456:tok","chatId":1,"parseMode":"RST"}`},
		{"BotTokenFile_NotAField", `{"botToken":"123456:tok","chatId":1,"botTokenFile":"/etc/token"}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var spec ChannelTelegramConfig
			assert.Error(t, json.Unmarshal([]byte(testCase.spec), &spec))
		})
	}
}

// Credentials read off the server's filesystem are not representable in the
// spec, and dropping them on read would unauthenticate the channel on the next
// write, so the read fails instead.
func TestDeriveChannelConfigRejectsTelegramFileCredentials(t *testing.T) {
	testCases := []struct {
		name string
		data string
	}{
		{"BotTokenFile", `{"name":"tg","telegram_configs":[{"chat_id":1,"token_file":"/etc/token"}]}`},
		{"ChatIDFile", `{"name":"tg","telegram_configs":[{"token":"123456:tok","chat_file":"/etc/chat"}]}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			channel := Channel{DisplayName: "tg", Data: testCase.data}
			_, err := channel.deriveChannelConfig()
			assert.Error(t, err)
		})
	}
}

func TestDefaultTelegramMessageTemplateEscapesAlertContent(t *testing.T) {
	tmpl, err := FromGlobs([]string{})
	require.NoError(t, err)
	tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080"}

	alert := &types.Alert{
		Alert: model.Alert{
			Labels:       model.LabelSet{"alertname": "p99 < 2s & rising", "severity": "critical"},
			Annotations:  model.LabelSet{"summary": "latency > 2s", "related_logs": "http://localhost:8080/logs?a=1&b=2"},
			GeneratorURL: "http://localhost:8080/alerts?a=1&b=2",
		},
		UpdatedAt: time.Now(),
	}

	data := tmpl.Data("__receiver", model.LabelSet{}, alert)

	// Upstream renders with html/template when parse_mode is HTML and with
	// text/template otherwise, so the template has to escape identically under
	// both. html/template recognises the html pipeline and adds no second pass.
	renderers := map[string]func(string, any) (string, error){
		"Text": tmpl.ExecuteTextString,
		"HTML": tmpl.ExecuteHTMLString,
	}

	for name, render := range renderers {
		t.Run(name, func(t *testing.T) {
			rendered, err := render(DefaultTelegramMessageTemplate, data)
			require.NoError(t, err)

			assert.Contains(t, rendered, "<b>[FIRING:1] p99 &lt; 2s &amp; rising</b>")
			assert.Contains(t, rendered, "<b>Summary:</b> latency &gt; 2s")
			assert.Contains(t, rendered, `<a href="http://localhost:8080/alerts?a=1&amp;b=2">View in SigNoz</a>`)
			assert.Contains(t, rendered, `<a href="http://localhost:8080/logs?a=1&amp;b=2">View related logs</a>`)
			assert.NotContains(t, rendered, "&amp;lt;", "double-escaped")
			assert.NotContains(t, rendered, "View related traces")
		})
	}
}

// Upstream's telegram notifier dereferences APIUrl and HTTPConfig without a nil
// check, and both are filled from the global rather than the spec. A resolve
// that leaves either nil panics at delivery instead of erroring.
func TestTelegramResolvesTheGlobalAPIURLAndHTTPConfig(t *testing.T) {
	cfg, err := NewDefaultConfig(GlobalConfig{}, RouteConfig{GroupInterval: 1 * time.Minute, GroupWait: 1 * time.Minute, RepeatInterval: 1 * time.Minute}, "org-1")
	require.NoError(t, err)
	require.NoError(t, cfg.SetGlobalConfig(GlobalConfig{}))

	spec := ChannelTelegramConfig{BotToken: "123456:tok", ChatID: -1001234567890}
	receiver, err := spec.toUndefaultedReceiver("tg")
	require.NoError(t, err)
	require.NoError(t, cfg.CreateReceiver(receiver))

	resolved, err := cfg.Resolved()
	require.NoError(t, err)

	resolvedReceiver, err := resolved.GetReceiver("tg")
	require.NoError(t, err)
	require.Len(t, resolvedReceiver.TelegramConfigs, 1)

	telegram := resolvedReceiver.TelegramConfigs[0]
	require.NotNil(t, telegram.APIUrl)
	assert.Equal(t, "https://api.telegram.org", telegram.APIUrl.String())
	assert.NotNil(t, telegram.HTTPConfig)
}
