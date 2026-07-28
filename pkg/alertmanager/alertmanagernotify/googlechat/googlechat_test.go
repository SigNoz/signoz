package googlechat

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func secretURLFromString(t *testing.T, rawURL string) *config.SecretURL {
	t.Helper()
	parsed, err := url.Parse(rawURL)
	require.NoError(t, err)
	return &config.SecretURL{URL: parsed}
}

func newTestNotifier(t *testing.T, webhookURL, title, text string) *Notifier {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, webhookURL),
		Title:      title,
		Text:       text,
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)
	return n
}

func newTestAlerts(alertname string) []*types.Alert {
	return []*types.Alert{{
		Alert: model.Alert{
			Labels:      model.LabelSet{"alertname": model.LabelValue(alertname)},
			Annotations: model.LabelSet{"summary": model.LabelValue("summary for " + alertname)},
			StartsAt:    time.Now(),
			EndsAt:      time.Now().Add(time.Minute),
		},
	}}
}

func newTestContext() context.Context {
	return notify.WithGroupKey(context.Background(), "test-receiver")
}

// captureServer starts an httptest server that decodes the posted Google Chat
// Message into got and replies with statusCode.
func captureServer(t *testing.T, statusCode int, got *Message) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got != nil {
			_ = json.NewDecoder(r.Body).Decode(got)
		}
		w.WriteHeader(statusCode)
	}))
}

func TestGoogleChatSend(t *testing.T) {
	var got Message
	server := captureServer(t, http.StatusOK, &got)
	defer server.Close()

	n := newTestNotifier(t, server.URL, `[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}`, "")
	retry, err := n.Notify(newTestContext(), newTestAlerts("TestAlert")...)

	require.NoError(t, err)
	require.False(t, retry)
	require.Contains(t, got.Text, "FIRING")
	require.Contains(t, got.Text, "TestAlert")
}

func TestGoogleChatTitleAndBody(t *testing.T) {
	var got Message
	server := captureServer(t, http.StatusOK, &got)
	defer server.Close()

	// static templates → assert the exact title\nbody join.
	n := newTestNotifier(t, server.URL, "TITLE", "BODY")
	retry, err := n.Notify(newTestContext(), newTestAlerts("TestAlert")...)

	require.NoError(t, err)
	require.False(t, retry)
	require.Equal(t, "TITLE\nBODY", got.Text)
}

func TestGoogleChatRetryCodes(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	for statusCode, expected := range test.RetryTests(test.DefaultRetryCodes()) {
		actual, _ := n.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "retry mismatch on status %d", statusCode)
	}
}

func TestGoogleChatRedactedURL(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()
	ctx = notify.WithGroupKey(ctx, "test-receiver")

	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: &config.SecretURL{URL: u},
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, n, u.String())
}
