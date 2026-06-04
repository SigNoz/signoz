// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package slack

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promslog"
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

func TestSlackRetry(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.SlackConfig{
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	for statusCode, expected := range test.RetryTests(test.DefaultRetryCodes()) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "error on status %d", statusCode)
	}
}

func TestSlackRedactedURL(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.SlackConfig{
			APIURL:     &config.SecretURL{URL: u},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, u.String())
}

func TestGettingSlackURLFromFile(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	f, err := os.CreateTemp(t.TempDir(), "slack_test")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(u.String())
	require.NoError(t, err, "writing to temp file failed")

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.SlackConfig{
			APIURLFile: f.Name(),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, u.String())
}

func TestTrimmingSlackURLFromFile(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	f, err := os.CreateTemp(t.TempDir(), "slack_test_newline")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(u.String() + "\n\n")
	require.NoError(t, err, "writing to temp file failed")

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.SlackConfig{
			APIURLFile: f.Name(),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, u.String())
}

func TestNotifier_Notify_WithReason(t *testing.T) {
	tests := []struct {
		name           string
		statusCode     int
		responseBody   string
		expectedReason notify.Reason
		expectedErr    string
		expectedRetry  bool
		noError        bool
	}{
		{
			name:           "with a 4xx status code",
			statusCode:     http.StatusUnauthorized,
			expectedReason: notify.ClientErrorReason,
			expectedRetry:  false,
			expectedErr:    "unexpected status code 401",
		},
		{
			name:           "with a 5xx status code",
			statusCode:     http.StatusInternalServerError,
			expectedReason: notify.ServerErrorReason,
			expectedRetry:  true,
			expectedErr:    "unexpected status code 500",
		},
		{
			name:           "with a 3xx status code",
			statusCode:     http.StatusTemporaryRedirect,
			expectedReason: notify.DefaultReason,
			expectedRetry:  false,
			expectedErr:    "unexpected status code 307",
		},
		{
			name:           "with a 1xx status code",
			statusCode:     http.StatusSwitchingProtocols,
			expectedReason: notify.DefaultReason,
			expectedRetry:  false,
			expectedErr:    "unexpected status code 101",
		},
		{
			name:           "2xx response with invalid JSON",
			statusCode:     http.StatusOK,
			responseBody:   `{"not valid json"}`,
			expectedReason: notify.ClientErrorReason,
			expectedRetry:  true,
			expectedErr:    "could not unmarshal",
		},
		{
			name:           "2xx response with a JSON error",
			statusCode:     http.StatusOK,
			responseBody:   `{"ok":false,"error":"error_message"}`,
			expectedReason: notify.ClientErrorReason,
			expectedRetry:  false,
			expectedErr:    "error response from Slack: error_message",
		},
		{
			name:           "2xx response with a plaintext error",
			statusCode:     http.StatusOK,
			responseBody:   "no_channel",
			expectedReason: notify.ClientErrorReason,
			expectedRetry:  false,
			expectedErr:    "error response from Slack: no_channel",
		},
		{
			name:         "successful JSON response",
			statusCode:   http.StatusOK,
			responseBody: `{"ok":true}`,
			noError:      true,
		},
		{
			name:         "successful plaintext response",
			statusCode:   http.StatusOK,
			responseBody: "ok",
			noError:      true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiurl, _ := url.Parse("https://slack.com/post.Message")
			tmpl := test.CreateTmpl(t)
			notifier, err := New(
				&config.SlackConfig{
					NotifierConfig: config.NotifierConfig{},
					HTTPConfig:     &commoncfg.HTTPClientConfig{},
					APIURL:         &config.SecretURL{URL: apiurl},
					Channel:        "channelname",
				},
				tmpl,
				promslog.NewNopLogger(),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)

			notifier.postJSONFunc = func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error) {
				resp := httptest.NewRecorder()
				if strings.HasPrefix(tt.responseBody, "{") {
					resp.Header().Add("Content-Type", "application/json; charset=utf-8")
				}
				resp.WriteHeader(tt.statusCode)
				_, _ = resp.WriteString(tt.responseBody)
				return resp.Result(), nil
			}
			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			alert1 := &types.Alert{
				Alert: model.Alert{
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}
			retry, err := notifier.Notify(ctx, alert1)
			require.Equal(t, tt.expectedRetry, retry)
			if tt.noError {
				require.NoError(t, err)
			} else {
				var reasonError *notify.ErrorWithReason
				require.ErrorAs(t, err, &reasonError)
				require.Equal(t, tt.expectedReason, reasonError.Reason)
				require.Contains(t, err.Error(), tt.expectedErr)
				require.Contains(t, err.Error(), "channelname")
			}
		})
	}
}

func TestSlackTimeout(t *testing.T) {
	tests := map[string]struct {
		latency time.Duration
		timeout time.Duration
		wantErr bool
	}{
		"success": {latency: 100 * time.Millisecond, timeout: 120 * time.Millisecond, wantErr: false},
		"error":   {latency: 100 * time.Millisecond, timeout: 80 * time.Millisecond, wantErr: true},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			u, _ := url.Parse("https://slack.com/post.Message")
			tmpl := test.CreateTmpl(t)
			notifier, err := New(
				&config.SlackConfig{
					NotifierConfig: config.NotifierConfig{},
					HTTPConfig:     &commoncfg.HTTPClientConfig{},
					APIURL:         &config.SecretURL{URL: u},
					Channel:        "channelname",
					Timeout:        tt.timeout,
				},
				tmpl,
				promslog.NewNopLogger(),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)
			notifier.postJSONFunc = func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error) {
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case <-time.After(tt.latency):
					resp := httptest.NewRecorder()
					resp.Header().Set("Content-Type", "application/json; charset=utf-8")
					resp.WriteHeader(http.StatusOK)
					_, _ = resp.WriteString(`{"ok":true}`)

					return resp.Result(), nil
				}
			}
			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			alert := &types.Alert{
				Alert: model.Alert{
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}
			_, err = notifier.Notify(ctx, alert)
			require.Equal(t, tt.wantErr, err != nil)
		})
	}
}

// setupTestContext creates a context with group key, receiver name, and group labels
// required by the notification processor.
func setupTestContext() context.Context {
	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group")
	ctx = notify.WithReceiverName(ctx, "slack")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{
		"alertname": "TestAlert",
		"severity":  "critical",
	})
	return ctx
}

func TestPrepareContent(t *testing.T) {
	t.Run("default template uses go text template config for title and body", func(t *testing.T) {
		// When alerts have no custom annotation templates (title_template / body_template),
		tmpl := test.CreateTmpl(t)
		templater := newTestTemplater(tmpl)
		notifier := &Notifier{
			conf: &config.SlackConfig{
				Title:     `{{ .CommonLabels.alertname }} ({{ .Status | toUpper }})`,
				Text:      `{{ range .Alerts }}Alert: {{ .Labels.alertname }} - severity {{ .Labels.severity }}{{ end }}`,
				Color:     `{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}`,
				TitleLink: "https://alertmanager.signoz.com",
			},
			tmpl:      tmpl,
			logger:    slog.New(slog.DiscardHandler),
			templater: templater,
		}

		ctx := setupTestContext()
		alerts := []*types.Alert{
			{Alert: model.Alert{
				Labels:   model.LabelSet{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			}},
		}

		// Build tmplText the same way Notify does
		var err error
		data := notify.GetTemplateData(ctx, tmpl, alerts, slog.New(slog.DiscardHandler))
		tmplText := notify.TmplText(tmpl, data, &err)

		atts, attErr := notifier.prepareContent(ctx, alerts, tmplText)
		require.NoError(t, attErr)
		require.NoError(t, err)
		require.Len(t, atts, 1)

		require.Equal(t, "HighCPU (FIRING)", atts[0].Title)
		require.Equal(t, "Alert: HighCPU - severity critical", atts[0].Text)
		// Color is templated — firing alert should be "danger"
		require.Equal(t, "danger", atts[0].Color)
		// No BlockKit blocks for default template
		require.Nil(t, atts[0].Blocks)
		// Default markdownIn when config has none
		require.Equal(t, []string{"fallback", "pretext", "text"}, atts[0].MrkdwnIn)
	})

	t.Run("custom template produces 1+N attachments with per-alert color", func(t *testing.T) {
		// When alerts carry custom $variable annotation templates (title_template / body_template)
		tmpl := test.CreateTmpl(t)
		templater := newTestTemplater(tmpl)
		notifier := &Notifier{
			conf: &config.SlackConfig{
				Title:     "default title fallback",
				Text:      "default text fallback",
				TitleLink: "https://alertmanager.signoz.com",
			},
			tmpl:      tmpl,
			logger:    slog.New(slog.DiscardHandler),
			templater: templater,
		}
		tmplText := func(s string) string { return s }

		bodyTemplate := `## $rule.name

**Service:** *$labels.service*
**Instance:** *$labels.instance*
**Region:** *$labels.region*
**Method:** *$labels.http_method*

---

| Metric | Value |
|--------|-------|
| **Current** | *$value* |
| **Threshold** | *$threshold.value* |

**Status:** $alert.status | **Severity:** $labels.severity`
		titleTemplate := "[$alert.status] $rule.name — $labels.service"

		ctx := setupTestContext()
		firingAlert := &types.Alert{
			Alert: model.Alert{
				Labels:   model.LabelSet{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical", "service": "api-server", "instance": "i-0abc123", "region": "us-east-1", "http_method": "GET"},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
				Annotations: model.LabelSet{
					ruletypes.AnnotationTitleTemplate: model.LabelValue(titleTemplate),
					ruletypes.AnnotationBodyTemplate:  model.LabelValue(bodyTemplate),
					"value":                           "100",
					"threshold.value":                 "200",
				},
			},
		}
		resolvedAlert := &types.Alert{
			Alert: model.Alert{
				Labels:   model.LabelSet{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical", "service": "api-server", "instance": "i-0abc123", "region": "us-east-1", "http_method": "GET"},
				StartsAt: time.Now().Add(-2 * time.Hour),
				EndsAt:   time.Now().Add(-time.Hour),
				Annotations: model.LabelSet{
					ruletypes.AnnotationTitleTemplate: model.LabelValue(titleTemplate),
					ruletypes.AnnotationBodyTemplate:  model.LabelValue(bodyTemplate),
					"value":                           "50",
					"threshold.value":                 "200",
				},
			},
		}

		atts, err := notifier.prepareContent(ctx, []*types.Alert{firingAlert, resolvedAlert}, tmplText)
		require.NoError(t, err)

		// 1 title attachment + 2 body attachments (one per alert)
		require.Len(t, atts, 3)

		// First attachment: title-only, no color, no blocks
		require.Equal(t, "[firing] HighCPU — api-server", atts[0].Title)
		require.Empty(t, atts[0].Color)
		require.Nil(t, atts[0].Blocks)
		require.Equal(t, "https://alertmanager.signoz.com", atts[0].TitleLink)

		expectedFiringBody := "*HighCPU*\n\n" +
			"*Service:* _api-server_\n*Instance:* _i-0abc123_\n*Region:* _us-east-1_\n*Method:* _GET_\n\n" +
			"---\n\n" +
			"```\nMetric    | Value\n----------|------\nCurrent   | 100  \nThreshold | 200  \n```\n\n" +
			"*Status:* firing | *Severity:* critical\n\n"

		expectedResolvedBody := "*HighCPU*\n\n" +
			"*Service:* _api-server_\n*Instance:* _i-0abc123_\n*Region:* _us-east-1_\n*Method:* _GET_\n\n" +
			"---\n\n" +
			"```\nMetric    | Value\n----------|------\nCurrent   | 50   \nThreshold | 200  \n```\n\n" +
			"*Status:* resolved | *Severity:* critical\n\n"

		// Second attachment: firing alert body rendered as slack mrkdwn text, red color
		require.Nil(t, atts[1].Blocks)
		require.Equal(t, "#FF0000", atts[1].Color)
		require.Equal(t, []string{"text"}, atts[1].MrkdwnIn)
		require.Equal(t, expectedFiringBody, atts[1].Text)

		// Third attachment: resolved alert body rendered as slack mrkdwn text, green color
		require.Nil(t, atts[2].Blocks)
		require.Equal(t, "#00FF00", atts[2].Color)
		require.Equal(t, []string{"text"}, atts[2].MrkdwnIn)
		require.Equal(t, expectedResolvedBody, atts[2].Text)
	})

	t.Run("default template with fields and actions", func(t *testing.T) {
		// Verifies that addFieldsAndActions (called from Notify after prepareContent)
		// correctly populates fields and actions on the attachment from config.
		tmpl := test.CreateTmpl(t)
		templater := newTestTemplater(tmpl)
		short := true
		notifier := &Notifier{
			conf: &config.SlackConfig{
				Title: `{{ .CommonLabels.alertname }}`,
				Text:  "alert text",
				Color: "warning",
				Fields: []*config.SlackField{
					{Title: "Severity", Value: "critical", Short: &short},
					{Title: "Service", Value: "api-server", Short: &short},
				},
				Actions: []*config.SlackAction{
					{Type: "button", Text: "View Alert", URL: "https://alertmanager.signoz.com"},
				},
				TitleLink: "https://alertmanager.signoz.com",
			},
			tmpl:      tmpl,
			logger:    slog.New(slog.DiscardHandler),
			templater: templater,
		}
		tmplText := func(s string) string { return s }

		ctx := setupTestContext()
		alerts := []*types.Alert{
			{Alert: model.Alert{
				Labels:   model.LabelSet{ruletypes.LabelAlertName: "TestAlert"},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			}},
		}
		atts, err := notifier.prepareContent(ctx, alerts, tmplText)
		require.NoError(t, err)
		require.Len(t, atts, 1)

		// prepareContent does not populate fields/actions — that's done by
		// addFieldsAndActions which is called from Notify.
		require.Nil(t, atts[0].Fields)
		require.Nil(t, atts[0].Actions)

		// Simulate what Notify does after prepareContent
		notifier.addFieldsAndActions(&atts[0], tmplText)

		// Verify fields
		require.Len(t, atts[0].Fields, 2)
		require.Equal(t, "Severity", atts[0].Fields[0].Title)
		require.Equal(t, "critical", atts[0].Fields[0].Value)
		require.True(t, *atts[0].Fields[0].Short)
		require.Equal(t, "Service", atts[0].Fields[1].Title)
		require.Equal(t, "api-server", atts[0].Fields[1].Value)

		// Verify actions
		require.Len(t, atts[0].Actions, 1)
		require.Equal(t, "button", atts[0].Actions[0].Type)
		require.Equal(t, "View Alert", atts[0].Actions[0].Text)
		require.Equal(t, "https://alertmanager.signoz.com", atts[0].Actions[0].URL)
	})
}

func TestSlackMessageField(t *testing.T) {
	// 1. Setup a fake Slack server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}

		// 2. VERIFY: Top-level text exists
		if body["text"] != "My Top Level Message" {
			t.Errorf("Expected top-level 'text' to be 'My Top Level Message', got %v", body["text"])
		}

		// 3. VERIFY: Old attachments still exist
		attachments, ok := body["attachments"].([]any)
		if !ok || len(attachments) == 0 {
			t.Errorf("Expected attachments to exist")
		} else {
			first := attachments[0].(map[string]any)
			if first["title"] != "Old Attachment Title" {
				t.Errorf("Expected attachment title 'Old Attachment Title', got %v", first["title"])
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok": true}`))
	}))
	defer server.Close()

	// 4. Configure Notifier with BOTH new and old fields
	u, _ := url.Parse(server.URL)
	conf := &config.SlackConfig{
		APIURL:      &config.SecretURL{URL: u},
		MessageText: "My Top Level Message", // Your NEW field
		Title:       "Old Attachment Title", // An OLD field
		Channel:     "#test-channel",
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
	}

	tmpl, err := template.FromGlobs([]string{})
	if err != nil {
		t.Fatal(err)
	}
	tmpl.ExternalURL = u

	logger := slog.New(slog.DiscardHandler)
	notifier, err := New(conf, tmpl, logger, newTestTemplater(tmpl))
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-key")

	if _, err := notifier.Notify(ctx); err != nil {
		t.Fatal("Notify failed:", err)
	}
}
