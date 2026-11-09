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
		Text:       alertmanagertypes.DefaultMattermostTextTemplate,
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

func TestNotifyBuildsOneCardPerAlert(t *testing.T) {
	resolved := newAlert("web-5", nil)
	resolved.EndsAt = time.Now().Add(-time.Minute)
	critical := newAlert("web-4", nil)
	critical.Labels["severity"] = "critical"

	mock := newMockWebhook(t, http.StatusOK)
	retry, err := newNotifier(t, mock.srv.URL).Notify(notify.WithGroupKey(context.Background(), "1"), newAlert("web-3", nil), critical, resolved)
	require.NoError(t, err)
	assert.False(t, retry)

	sent := mock.only(t)
	assert.Equal(t, "alerts", sent["channel"])
	assert.Equal(t, "signoz", sent["username"])
	assert.Equal(t, ":bell:", sent["icon_emoji"])

	cards := sent["attachments"].([]any)
	require.Len(t, cards, 3)

	testCases := []struct {
		title string
		color string
		host  string
	}{
		{":large_yellow_circle: FIRING: checkout-latency-high", colorWarning, "web-3"},
		{":red_circle: FIRING: checkout-latency-high", colorCritical, "web-4"},
		{":large_green_circle: RESOLVED: checkout-latency-high", colorResolved, "web-5"},
	}
	for i, testCase := range testCases {
		card := cards[i].(map[string]any)
		assert.Equal(t, testCase.title, card["title"])
		assert.Equal(t, testCase.color, card["color"])
		assert.Equal(t, "http://am/alerts/overview?ruleId=r1", card["title_link"])
		// each card renders the channel text for its own alert only
		assert.Contains(t, card["text"], "p99 is 612ms")
		assert.Contains(t, card["text"], "`host: "+testCase.host+"`")
		assert.NotContains(t, card["text"], "alertname")
	}
}

func TestNotifyAppliesRuleTemplates(t *testing.T) {
	testCases := []struct {
		name        string
		annotations model.LabelSet
		wantTitle   string
		wantText    string
	}{
		{
			name: "TitleAndBody",
			annotations: model.LabelSet{
				ruletypes.AnnotationTitleTemplate: "Incident on $labels.host",
				ruletypes.AnnotationBodyTemplate:  "**$alert.status** for `$rule.name`",
			},
			wantTitle: ":large_yellow_circle: FIRING: Incident on web-3",
			wantText:  "**firing** for `checkout-latency-high`",
		},
		{
			name:        "BodyOnly_KeepsTheAlertName",
			annotations: model.LabelSet{ruletypes.AnnotationBodyTemplate: "host $labels.host"},
			wantTitle:   ":large_yellow_circle: FIRING: checkout-latency-high",
			wantText:    "host web-3",
		},
		{
			name:        "TitleOnly_KeepsTheChannelText",
			annotations: model.LabelSet{ruletypes.AnnotationTitleTemplate: "Incident on $labels.host"},
			wantTitle:   ":large_yellow_circle: FIRING: Incident on web-3",
			wantText:    "p99 is 612ms",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mock := newMockWebhook(t, http.StatusOK)
			_, err := newNotifier(t, mock.srv.URL).Notify(notify.WithGroupKey(context.Background(), "1"), newAlert("web-3", testCase.annotations))
			require.NoError(t, err)

			card := mock.only(t)["attachments"].([]any)[0].(map[string]any)
			assert.Equal(t, testCase.wantTitle, card["title"])
			assert.Contains(t, card["text"], testCase.wantText)
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
		"ChannelText":  nil,
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
