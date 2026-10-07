package telegram

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"sync"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockBotAPI answers sendMessage the way api.telegram.org does. telebot posts
// every parameter as a string but parses chat.id back into an int64, so the
// echoed id has to be a number or the send fails and the pipeline retries.
type mockBotAPI struct {
	srv  *httptest.Server
	mu   sync.Mutex
	sent []map[string]string
}

func newMockBotAPI(t *testing.T) *mockBotAPI {
	t.Helper()
	mock := &mockBotAPI{}
	mock.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var params map[string]string
		_ = json.NewDecoder(r.Body).Decode(&params)

		mock.mu.Lock()
		mock.sent = append(mock.sent, params)
		mock.mu.Unlock()

		chatID, _ := strconv.ParseInt(params["chat_id"], 10, 64)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"result":{"message_id":1,"date":0,"chat":{"id":` + strconv.FormatInt(chatID, 10) + `,"type":"private"}}}`))
	}))
	t.Cleanup(mock.srv.Close)

	return mock
}

func (m *mockBotAPI) only(t *testing.T) map[string]string {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()
	require.Len(t, m.sent, 1)

	return m.sent[0]
}

func newNotifier(t *testing.T, mock *mockBotAPI) *Notifier {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	apiURL, err := url.Parse(mock.srv.URL)
	require.NoError(t, err)

	logger := slog.New(slog.DiscardHandler)
	notifier, err := New(&config.TelegramConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		APIUrl:     &config.URL{URL: apiURL},
		BotToken:   "123456:tok",
		ChatID:     -1001234567890,
		ParseMode:  "HTML",
		Message:    alertmanagertypes.DefaultTelegramMessageTemplate,
	}, tmpl, logger, alertmanagertemplate.New(tmpl, logger))
	require.NoError(t, err)

	return notifier
}

func newAlert(host string, annotations model.LabelSet) *types.Alert {
	merged := model.LabelSet{"summary": "p99 is 612ms"}
	for name, value := range annotations {
		merged[name] = value
	}

	return &types.Alert{
		Alert: model.Alert{
			Labels:       model.LabelSet{"alertname": "checkout-latency-high", "severity": "warning", "host": model.LabelValue(host)},
			Annotations:  merged,
			StartsAt:     time.Now(),
			EndsAt:       time.Now().Add(time.Hour),
			GeneratorURL: "http://am/alerts/overview?ruleId=r1",
		},
	}
}

func TestNotifyBuildsTheMessage(t *testing.T) {
	testCases := []struct {
		name            string
		alerts          []*types.Alert
		wantExact       string
		wantContains    []string
		wantNotContains []string
	}{
		{
			name:   "NoRuleTemplates_UsesChannelTemplate",
			alerts: []*types.Alert{newAlert("web-3", nil)},
			wantContains: []string{
				"<b>[FIRING:1] checkout-latency-high</b>",
				"<b>Summary:</b> p99 is 612ms",
				`<a href="http://am/alerts/overview?ruleId=r1">View in SigNoz</a>`,
			},
		},
		{
			name: "TitleAndBody_ReplaceTheChannelTemplate",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationTitleTemplate: "Incident on $labels.host",
				ruletypes.AnnotationBodyTemplate:  "$alert.status for $rule.name",
			})},
			wantExact:       "<b>Incident on web-3</b>\n\nfiring for checkout-latency-high",
			wantNotContains: []string{"View in SigNoz"},
		},
		{
			// $-refs are template variables, so the braced form is the real
			// syntax and the only one that reaches conditionals. A bare ref in
			// text is rewritten into an action before expansion.
			name: "BracedAndBareRefs_ExpandAlike",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "{{ $rule.name }}|$rule.name|{{ if $alert.is_firing }}up{{ end }}",
			})},
			wantExact: "checkout-latency-high|checkout-latency-high|up",
		},
		{
			name: "BodyOnly_OmitsTheTitleLine",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "$alert.status for $rule.name",
			})},
			wantExact: "firing for checkout-latency-high",
		},
		{
			name: "TitleOnly_KeepsTheChannelBody",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationTitleTemplate: "Incident on $labels.host",
			})},
			wantContains: []string{"<b>Incident on web-3</b>", "<b>Summary:</b> p99 is 612ms"},
		},
		{
			// Rule templates are authored in markdown for every channel, so
			// Telegram converts rather than escaping the markers away.
			name: "RuleTemplateMarkdown_RenderedToTelegramHTML",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "**{{ $rule.name }}** on `{{ $labels.host }}` — [open](https://signoz.io/d?a=1&b=2)",
			})},
			wantExact: `<b>checkout-latency-high</b> on <code>web-3</code> — <a href="https://signoz.io/d?a=1&amp;b=2">open</a>`,
		},
		{
			// The templater renders plain text, so anything interpolated from
			// an alert has to be escaped before a parse_mode HTML send.
			name: "RuleTemplateOutput_EscapedForHTML",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				"summary":                         "p99 < 2s & rising",
				ruletypes.AnnotationTitleTemplate: "$annotations.summary",
				ruletypes.AnnotationBodyTemplate:  "$annotations.summary",
			})},
			wantExact: "<b>p99 &lt; 2s &amp; rising</b>\n\np99 &lt; 2s &amp; rising",
		},
		{
			name: "GroupedAlerts_BodyRenderedPerAlert",
			alerts: []*types.Alert{
				newAlert("web-3", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"}),
				newAlert("web-4", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"}),
			},
			wantExact: "host web-3\n\nhost web-4",
		},
		{
			// Picking one rule's template for a mixed group would be arbitrary,
			// so the channel template is used instead.
			name: "GroupedAlerts_DisagreeingTemplates_FallBackToChannel",
			alerts: []*types.Alert{
				newAlert("web-3", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"}),
				newAlert("web-4", model.LabelSet{ruletypes.AnnotationBodyTemplate: "something else"}),
			},
			wantContains: []string{"<b>Summary:</b> p99 is 612ms"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mock := newMockBotAPI(t)

			retry, err := newNotifier(t, mock).Notify(notify.WithGroupKey(context.Background(), "1"), testCase.alerts...)
			require.NoError(t, err)
			assert.False(t, retry)

			text := mock.only(t)["text"]
			if testCase.wantExact != "" {
				assert.Equal(t, testCase.wantExact, text)
			}
			for _, want := range testCase.wantContains {
				assert.Contains(t, text, want)
			}
			for _, notWant := range testCase.wantNotContains {
				assert.NotContains(t, text, notWant)
			}
		})
	}
}

// A v1-written receiver can carry a mode the v2 spec no longer offers. Nothing
// renders to those, so the integration refuses to build rather than sending
// HTML-escaped text under a markdown parser.
func TestNewRejectsAParseModeOtherThanHTML(t *testing.T) {
	testCases := []struct {
		name      string
		parseMode string
		wantErr   bool
	}{
		{"HTML", "HTML", false},
		{"MarkdownV2", "MarkdownV2", true},
		{"Markdown", "Markdown", true},
		{"Empty", "", true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mock := newMockBotAPI(t)
			apiURL, err := url.Parse(mock.srv.URL)
			require.NoError(t, err)

			tmpl := test.CreateTmpl(t)
			logger := slog.New(slog.DiscardHandler)
			_, err = New(&config.TelegramConfig{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				APIUrl:     &config.URL{URL: apiURL},
				BotToken:   "123456:tok",
				ChatID:     -1001234567890,
				ParseMode:  testCase.parseMode,
				Message:    alertmanagertypes.DefaultTelegramMessageTemplate,
			}, tmpl, logger, alertmanagertemplate.New(tmpl, logger))

			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestNotifySendsTheConfiguredSendOptions(t *testing.T) {
	mock := newMockBotAPI(t)

	_, err := newNotifier(t, mock).Notify(notify.WithGroupKey(context.Background(), "1"), newAlert("web-3", nil))
	require.NoError(t, err)

	sent := mock.only(t)
	assert.Equal(t, "-1001234567890", sent["chat_id"])
	assert.Equal(t, "HTML", sent["parse_mode"])
}
