package mattermost

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockWebhook answers posts the way a Mattermost incoming webhook does: a
// plain-text "ok" on success.
type mockWebhook struct {
	srv  *httptest.Server
	mu   sync.Mutex
	sent []map[string]any
}

func newMockWebhook(t *testing.T, status int) *mockWebhook {
	t.Helper()
	mock := &mockWebhook{}
	mock.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)

		mock.mu.Lock()
		mock.sent = append(mock.sent, body)
		mock.mu.Unlock()

		w.WriteHeader(status)
		_, _ = w.Write([]byte("ok"))
	}))
	t.Cleanup(mock.srv.Close)

	return mock
}

func (m *mockWebhook) only(t *testing.T) map[string]any {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()
	require.Len(t, m.sent, 1)

	return m.sent[0]
}

func newNotifier(t *testing.T, webhookURL string) *Notifier {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	parsed, err := url.Parse(webhookURL)
	require.NoError(t, err)

	logger := slog.New(slog.DiscardHandler)
	notifier, err := New(&config.MattermostConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: &config.SecretURL{URL: parsed},
		Channel:    "alerts",
		Username:   "signoz",
		IconEmoji:  ":bell:",
		Text:       config.DefaultMattermostConfig.Text,
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

func TestNotifyBuildsTheText(t *testing.T) {
	testCases := []struct {
		name            string
		alerts          []*types.Alert
		wantExact       string
		wantContains    []string
		wantNotContains []string
	}{
		{
			// Without rule templates the post is upstream's, channel text and all.
			name:         "NoRuleTemplates_UsesChannelText",
			alerts:       []*types.Alert{newAlert("web-3", nil)},
			wantContains: []string{"# Alerts Firing:", "alertname = checkout-latency-high"},
		},
		{
			name: "TitleAndBody_ReplaceTheChannelText",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationTitleTemplate: "Incident on $labels.host",
				ruletypes.AnnotationBodyTemplate:  "$alert.status for $rule.name",
			})},
			wantExact: "#### Incident on web-3\n\nfiring for checkout-latency-high",
		},
		{
			name: "BodyOnly_SendsTheBodyAlone",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "$alert.status for $rule.name",
			})},
			wantExact: "firing for checkout-latency-high",
		},
		{
			name: "TitleOnly_KeepsTheChannelText",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationTitleTemplate: "Incident on $labels.host",
			})},
			wantContains: []string{"#### Incident on web-3\n\n", "# Alerts Firing:"},
		},
		{
			// Mattermost renders markdown itself, so rule templates go out as
			// authored rather than through a renderer.
			name: "RuleTemplateMarkdown_SentAsIs",
			alerts: []*types.Alert{newAlert("web-3", model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "**{{ $rule.name }}** on `{{ $labels.host }}` — [open](https://signoz.io/d?a=1&b=2)",
			})},
			wantExact: "**checkout-latency-high** on `web-3` — [open](https://signoz.io/d?a=1&b=2)",
		},
		{
			name: "GroupedAlerts_BodyRenderedPerAlert",
			alerts: []*types.Alert{
				newAlert("web-3", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"}),
				newAlert("web-4", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"}),
			},
			wantExact: "host web-3\n\nhost web-4",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mock := newMockWebhook(t, http.StatusOK)

			retry, err := newNotifier(t, mock.srv.URL).Notify(notify.WithGroupKey(context.Background(), "1"), testCase.alerts...)
			require.NoError(t, err)
			assert.False(t, retry)

			sent := mock.only(t)
			assert.Equal(t, "alerts", sent["channel"])
			assert.Equal(t, "signoz", sent["username"])
			assert.Equal(t, ":bell:", sent["icon_emoji"])

			text, _ := sent["text"].(string)
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

func TestNotifyRetriesOnlyRateLimitAndServerErrors(t *testing.T) {
	testCases := []struct {
		name      string
		status    int
		wantErr   bool
		wantRetry bool
	}{
		{"OK_NoRetry", http.StatusOK, false, false},
		{"TooManyRequests_Retries", http.StatusTooManyRequests, true, true},
		{"InternalServerError_Retries", http.StatusInternalServerError, true, true},
		{"BadRequest_DoesNotRetry", http.StatusBadRequest, true, false},
		{"Forbidden_DoesNotRetry", http.StatusForbidden, true, false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mock := newMockWebhook(t, testCase.status)
			alert := newAlert("web-3", model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"})

			retry, err := newNotifier(t, mock.srv.URL).Notify(notify.WithGroupKey(context.Background(), "1"), alert)
			if testCase.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, testCase.wantRetry, retry)
		})
	}
}

// The webhook URL is the credential, so a failed post must not echo it.
func TestNotifyRedactsTheWebhookURLFromErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	webhookURL := srv.URL + "/hooks/s3cr3tt0k3n"
	srv.Close()

	for name, annotations := range map[string]model.LabelSet{
		"Upstream":     nil,
		"RuleTemplate": {ruletypes.AnnotationBodyTemplate: "host $labels.host"},
	} {
		t.Run(name, func(t *testing.T) {
			retry, err := newNotifier(t, webhookURL).Notify(notify.WithGroupKey(context.Background(), "1"), newAlert("web-3", annotations))
			require.Error(t, err)
			assert.True(t, retry)
			assert.NotContains(t, err.Error(), "s3cr3tt0k3n")
		})
	}
}
