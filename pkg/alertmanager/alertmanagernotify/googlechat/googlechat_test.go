package googlechat

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
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
// Message into got and replies 200.
func captureServer(t *testing.T, got *Message) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got != nil {
			_ = json.NewDecoder(r.Body).Decode(got)
		}
		w.WriteHeader(http.StatusOK)
	}))
}

func TestGoogleChatSend(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
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
	server := captureServer(t, &got)
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

	cases := []struct {
		code  int
		retry bool
	}{
		{http.StatusOK, false},
		{http.StatusBadRequest, false},         // 400: malformed payload, permanent
		{http.StatusTooManyRequests, true},     // 429: rate limited, retry (our RetryCodes)
		{http.StatusInternalServerError, true}, // 5xx: retry
		{http.StatusServiceUnavailable, true},
	}
	for _, c := range cases {
		t.Run(http.StatusText(c.code), func(t *testing.T) {
			actual, _ := n.retrier.Check(c.code, nil)
			require.Equal(t, c.retry, actual, "retry mismatch on status %d", c.code)
		})
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
		Title:      "alert", // non-empty so it reaches the POST (not the empty-text guard)
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, n, u.String())
}

func TestTruncateToByteLimit(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		max     int
		wantLen int    // upper bound on byte length of result
		wantHas string // substring the result must contain (or "")
	}{
		{"under limit passthrough", "hello", 100, 5, "hello"},
		{"over limit trims with ellipsis", strings.Repeat("a", 50), 10, 10, "..."},
		{"exact limit passthrough", "hello", 5, 5, "hello"},
		{"tiny limit", "hello", 2, 2, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := truncateToByteLimit(c.in, c.max)
			require.LessOrEqual(t, len(got), c.wantLen)
			if c.wantHas != "" {
				require.Contains(t, got, c.wantHas)
			}
		})
	}
}

func TestGoogleChatMessageSizeLimit(t *testing.T) {
	var bodyLen int
	var valid bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		bodyLen = len(raw)
		valid = json.Valid(raw)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Huge plain-ASCII title so one-time truncation lands deterministically under the limit.
	n := newTestNotifier(t, server.URL, strings.Repeat("A", 40000), "")
	retry, err := n.Notify(newTestContext(), newTestAlerts("Big")...)

	require.NoError(t, err)
	require.False(t, retry)
	require.True(t, valid, "posted body must be valid JSON")
	require.LessOrEqual(t, bodyLen, maxMessageBytes, "posted body must be within the size limit")
}

func TestGoogleChatThreading(t *testing.T) {
	var query url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query = r.URL.Query()
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	cases := []struct{ name, groupKey string }{
		{"rule a", "{ruleId=\"aaa\"}"},
		{"rule b", "{ruleId=\"bbb\"}"},
	}
	seen := map[string]string{}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			n := newTestNotifier(t, server.URL, "T", "")
			ctx := notify.WithGroupKey(context.Background(), c.groupKey)
			_, err := n.Notify(ctx, newTestAlerts("X")...)
			require.NoError(t, err)

			require.Equal(t, "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD", query.Get("messageReplyOption"))
			threadKey := query.Get("threadKey")
			require.Equal(t, notify.Key(c.groupKey).Hash(), threadKey, "threadKey must be the group key hash")
			seen[c.name] = threadKey
		})
	}
	require.NotEqual(t, seen["rule a"], seen["rule b"], "distinct group keys must yield distinct threadKeys")
}

func TestGoogleChatCustomTemplateMarkdown(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
	defer server.Close()

	// Custom body template (standard markdown) supplied via annotation → the
	// !IsDefaultBody path must convert it to Google Chat dialect.
	alerts := []*types.Alert{{
		Alert: model.Alert{
			Labels:      model.LabelSet{"alertname": "X"},
			Annotations: model.LabelSet{ruletypes.AnnotationBodyTemplate: "**bold** and [link](https://x)"},
			StartsAt:    time.Now(),
			EndsAt:      time.Now().Add(time.Minute),
		},
	}}
	n := newTestNotifier(t, server.URL, "Alert", "default body")
	_, err := n.Notify(newTestContext(), alerts...)
	require.NoError(t, err)

	require.Contains(t, got.Text, "*bold*", "** should convert to *")
	require.Contains(t, got.Text, "<https://x|link>", "[t](u) should convert to <u|t>")
	require.NotContains(t, got.Text, "**bold**", "conversion must have happened")
}

func TestGoogleChatSerializedSizeUnderLimit(t *testing.T) {
	var bodyLen int
	var valid bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		bodyLen = len(raw)
		valid = json.Valid(raw)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Escaping-dense payload: <, >, & and newlines each expand under JSON
	// encoding, so this is the shape that would push the serialized body over
	// the limit if we measured the text bytes instead of the marshaled buffer.
	dense := strings.Repeat("<https://example.com/a?x=1&y=2|link>\n", 2000)
	n := newTestNotifier(t, server.URL, dense, "")
	_, err := n.Notify(newTestContext(), newTestAlerts("Dense")...)

	require.NoError(t, err)
	require.True(t, valid, "posted body must be valid JSON")
	require.LessOrEqual(t, bodyLen, maxMessageBytes, "serialized body must be within the limit")
}

func TestGoogleChatEmptyText(t *testing.T) {
	server := captureServer(t, nil)
	defer server.Close()

	// Empty title and body templates → must not POST; fail non-retryably.
	n := newTestNotifier(t, server.URL, "", "")
	retry, err := n.Notify(newTestContext(), newTestAlerts("X")...)

	require.Error(t, err)
	require.False(t, retry)
}
