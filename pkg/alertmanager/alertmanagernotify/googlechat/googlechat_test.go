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

	n := newTestNotifier(t, server.URL, "TITLE", "BODY")
	retry, err := n.Notify(newTestContext(), newTestAlerts("TestAlert")...)

	require.NoError(t, err)
	require.False(t, retry)
	// Title is the plain summary + card header; body lives in a card widget.
	require.Equal(t, "TITLE", got.Text)
	require.Equal(t, "TITLE", got.CardsV2[0].Card.Header.Title)
	require.Contains(t, cardBody(t, got), "BODY")
}

// cardBody concatenates the text of all textParagraph widgets in the message.
func cardBody(t *testing.T, m Message) string {
	t.Helper()
	require.NotEmpty(t, m.CardsV2)
	var b strings.Builder
	for _, s := range m.CardsV2[0].Card.Sections {
		for _, w := range s.Widgets {
			if w.TextParagraph != nil {
				b.WriteString(w.TextParagraph.Text)
				b.WriteByte('\n')
			}
		}
	}
	return b.String()
}

// cardButtons returns all buttons across every buttonList widget in the card.
func cardButtons(t *testing.T, m Message) []button {
	t.Helper()
	require.NotEmpty(t, m.CardsV2)
	var buttons []button
	for _, s := range m.CardsV2[0].Card.Sections {
		for _, w := range s.Widgets {
			if w.ButtonList != nil {
				buttons = append(buttons, w.ButtonList.Buttons...)
			}
		}
	}
	return buttons
}

// cardSectionCount returns the number of sections in the card.
func cardSectionCount(t *testing.T, m Message) int {
	t.Helper()
	require.NotEmpty(t, m.CardsV2)
	return len(m.CardsV2[0].Card.Sections)
}

func TestGoogleChatNilHTTPConfig(t *testing.T) {
	// A nil HTTPConfig must fail cleanly, not panic on the *conf.HTTPConfig deref.
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: nil,
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.Error(t, err)
	require.Nil(t, n)
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

	// Custom body is standard markdown → converted to card HTML.
	body := cardBody(t, got)
	require.Contains(t, body, "<strong>bold</strong>", "** should convert to HTML bold")
	require.Contains(t, body, `<a href="https://x">link</a>`, "[t](u) should convert to an HTML link")
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

func TestGoogleChatLinkButtons(t *testing.T) {
	cases := []struct {
		name        string
		labels      model.LabelSet
		annotations model.LabelSet
		wantButtons map[string]string
	}{
		{
			name: "all links present",
			labels: model.LabelSet{
				"alertname":               "X",
				ruletypes.LabelRuleSource: "https://signoz.example/alerts/1",
			},
			annotations: model.LabelSet{
				ruletypes.AnnotationRelatedLogs:   "https://signoz.example/logs",
				ruletypes.AnnotationRelatedTraces: "https://signoz.example/traces",
			},
			wantButtons: map[string]string{
				"Open in SigNoz":      "https://signoz.example/alerts/1",
				"View Related Logs":   "https://signoz.example/logs",
				"View Related Traces": "https://signoz.example/traces",
			},
		},
		{
			name:        "no links → no buttons",
			labels:      model.LabelSet{"alertname": "X"},
			annotations: model.LabelSet{"summary": "s"},
			wantButtons: map[string]string{},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var got Message
			server := captureServer(t, &got)
			defer server.Close()

			alerts := []*types.Alert{{Alert: model.Alert{
				Labels:      c.labels,
				Annotations: c.annotations,
				StartsAt:    time.Now(),
				EndsAt:      time.Now().Add(time.Minute),
			}}}
			// Non-empty body so the alert section (which carries related buttons) exists.
			n := newTestNotifier(t, server.URL, "T", "an alert")
			_, err := n.Notify(newTestContext(), alerts...)
			require.NoError(t, err)

			buttons := cardButtons(t, got)
			require.Len(t, buttons, len(c.wantButtons))
			for _, b := range buttons {
				require.Equal(t, c.wantButtons[b.Text], b.OnClick.OpenLink.URL, "button %q", b.Text)
			}
		})
	}
}

func TestGoogleChatFooterButtonSurvivesEmptyBody(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
	defer server.Close()

	// Cleared Description (empty text template) → body renders empty while the
	// title still renders. The per-rule "Open in SigNoz" button must survive.
	alerts := []*types.Alert{{Alert: model.Alert{
		Labels: model.LabelSet{
			"alertname":               "X",
			ruletypes.LabelRuleSource: "https://signoz.example/alerts/1",
		},
		StartsAt: time.Now(),
		EndsAt:   time.Now().Add(time.Minute),
	}}}
	n := newTestNotifier(t, server.URL, "TITLE", "")
	_, err := n.Notify(newTestContext(), alerts...)
	require.NoError(t, err)

	buttons := cardButtons(t, got)
	require.Len(t, buttons, 1)
	require.Equal(t, "Open in SigNoz", buttons[0].Text)
	require.Equal(t, "https://signoz.example/alerts/1", buttons[0].OnClick.OpenLink.URL)
}

func TestGoogleChatMultiAlertSections(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
	defer server.Close()

	// A per-alert custom body template yields one card section per alert, each
	// with that alert's own related-link buttons, plus one shared SigNoz button.
	mkAlert := func(pod, logs string) *types.Alert {
		return &types.Alert{Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname":               "X",
				"pod":                     model.LabelValue(pod),
				ruletypes.LabelRuleSource: "https://signoz.example/alerts/1",
			},
			Annotations: model.LabelSet{
				ruletypes.AnnotationBodyTemplate: "an alert fired",
				ruletypes.AnnotationRelatedLogs:  model.LabelValue(logs),
			},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		}}
	}
	alerts := []*types.Alert{
		mkAlert("pod-1", "https://signoz.example/logs?pod=pod-1"),
		mkAlert("pod-2", "https://signoz.example/logs?pod=pod-2"),
	}
	n := newTestNotifier(t, server.URL, "T", "default body")
	_, err := n.Notify(newTestContext(), alerts...)
	require.NoError(t, err)

	// banner + one section per alert + shared SigNoz footer.
	require.Equal(t, 4, cardSectionCount(t, got))

	sigNoz := 0
	logsURLs := map[string]bool{}
	for _, b := range cardButtons(t, got) {
		switch b.Text {
		case "Open in SigNoz":
			sigNoz++
		case "View Related Logs":
			logsURLs[b.OnClick.OpenLink.URL] = true
		}
	}
	require.Equal(t, 1, sigNoz, "SigNoz button must appear once (shared, per-rule)")
	require.True(t, logsURLs["https://signoz.example/logs?pod=pod-1"], "pod-1's logs button")
	require.True(t, logsURLs["https://signoz.example/logs?pod=pod-2"], "pod-2's logs button")
}

func TestGoogleChatDefaultBodyGrouped(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
	defer server.Close()

	// Default body template (no per-alert annotation): the templater combines all
	// grouped alerts into ONE section, carrying only the first alert's buttons.
	mkAlert := func(pod string) *types.Alert {
		return &types.Alert{Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname":               "X",
				"pod":                     model.LabelValue(pod),
				ruletypes.LabelRuleSource: "https://signoz.example/alerts/1",
			},
			Annotations: model.LabelSet{
				ruletypes.AnnotationRelatedLogs: model.LabelValue("https://signoz.example/logs?pod=" + pod),
			},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		}}
	}
	alerts := []*types.Alert{mkAlert("pod-1"), mkAlert("pod-2")}
	n := newTestNotifier(t, server.URL, "T", "{{ range .Alerts }}pod {{ .Labels.pod }} {{ end }}")
	_, err := n.Notify(newTestContext(), alerts...)
	require.NoError(t, err)

	// banner + one combined alert section + shared SigNoz footer = 3 sections.
	require.Equal(t, 3, cardSectionCount(t, got))

	body := cardBody(t, got)
	require.Contains(t, body, "pod-1")
	require.Contains(t, body, "pod-2", "default template combines all alerts into one section")

	logs := 0
	for _, b := range cardButtons(t, got) {
		if b.Text == "View Related Logs" {
			logs++
		}
	}
	require.Equal(t, 1, logs, "default path surfaces only the first alert's related buttons")
}

func TestGoogleChatSectionCap(t *testing.T) {
	var got Message
	server := captureServer(t, &got)
	defer server.Close()

	// 35 grouped alerts (custom body → per-alert bodies) exceed the 30 cap.
	const total = 35
	alerts := make([]*types.Alert, 0, total)
	for range total {
		alerts = append(alerts, &types.Alert{Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname":               "X",
				ruletypes.LabelRuleSource: "https://signoz.example/alerts/1",
			},
			Annotations: model.LabelSet{ruletypes.AnnotationBodyTemplate: "an alert fired"},
			StartsAt:    time.Now(),
			EndsAt:      time.Now().Add(time.Minute),
		}})
	}
	n := newTestNotifier(t, server.URL, "T", "default body")
	_, err := n.Notify(newTestContext(), alerts...)
	require.NoError(t, err)

	// banner + 30 alert sections + "+N more" note + shared SigNoz footer.
	require.Equal(t, 1+maxAlertSections+1+1, cardSectionCount(t, got))

	body := cardBody(t, got)
	require.Contains(t, body, "5 more alerts", "overflow note must state the dropped count")

	// The SigNoz footer must survive after the note (last section).
	sigNoz := 0
	for _, b := range cardButtons(t, got) {
		if b.Text == "Open in SigNoz" {
			sigNoz++
		}
	}
	require.Equal(t, 1, sigNoz, "SigNoz footer must be present despite the cap")
}

func TestGoogleChatStatusLine(t *testing.T) {
	cases := []struct {
		name     string
		resolved bool
		want     string
	}{
		{"firing", false, "🔴 FIRING"},
		{"resolved", true, "🟢 RESOLVED"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var got Message
			server := captureServer(t, &got)
			defer server.Close()

			endsAt := time.Now().Add(time.Minute)
			if c.resolved {
				endsAt = time.Now().Add(-time.Minute) // EndsAt in the past → resolved
			}
			alerts := []*types.Alert{{Alert: model.Alert{
				Labels:   model.LabelSet{"alertname": "X"},
				StartsAt: time.Now().Add(-2 * time.Minute),
				EndsAt:   endsAt,
			}}}
			n := newTestNotifier(t, server.URL, "T", "")
			_, err := n.Notify(newTestContext(), alerts...)
			require.NoError(t, err)

			require.Contains(t, cardBody(t, got), c.want)
		})
	}
}
