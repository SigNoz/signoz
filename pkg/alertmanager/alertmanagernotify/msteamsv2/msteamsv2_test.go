// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package msteamsv2

import (
	"bytes"
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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

// This is a test URL that has been modified to not be valid.
var testWebhookURL, _ = url.Parse("https://example.westeurope.logic.azure.com:443/workflows/xxx/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xxx")

func TestMSTeamsV2Retry(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURL: &config.SecretURL{URL: testWebhookURL},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	for statusCode, expected := range test.RetryTests(test.DefaultRetryCodes()) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		assert.Equal(t, expected, actual, "retry - error on status %d", statusCode)
	}
}

func TestNotifier_Notify_WithReason(t *testing.T) {
	tests := []struct {
		name            string
		statusCode      int
		responseContent string
		expectedReason  notify.Reason
		noError         bool
	}{
		{
			name:            "with a 2xx status code and response 1",
			statusCode:      http.StatusOK,
			responseContent: "1",
			noError:         true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpl := test.CreateTmpl(t)
			notifier, err := New(
				&config.MSTeamsV2Config{
					WebhookURL: &config.SecretURL{URL: testWebhookURL},
					HTTPConfig: &commoncfg.HTTPClientConfig{},
				},
				tmpl,
				`{{ template "msteamsv2.default.titleLink" . }}`,
				promslog.NewNopLogger(),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)

			notifier.postJSONFunc = func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error) {
				resp := httptest.NewRecorder()
				_, err := resp.WriteString(tt.responseContent)
				require.NoError(t, err)
				resp.WriteHeader(tt.statusCode)
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
			_, err = notifier.Notify(ctx, alert1)
			if tt.noError {
				require.NoError(t, err)
			} else {
				var reasonError *notify.ErrorWithReason
				require.ErrorAs(t, err, &reasonError)
				assert.Equal(t, tt.expectedReason, reasonError.Reason)
			}
		})
	}
}

func TestMSTeamsV2Templating(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dec := json.NewDecoder(r.Body)
		out := make(map[string]any)
		err := dec.Decode(&out)
		if err != nil {
			panic(err)
		}
	}))
	defer srv.Close()
	u, _ := url.Parse(srv.URL)

	for _, tc := range []struct {
		title     string
		cfg       *config.MSTeamsV2Config
		titleLink string

		errMsg string
	}{
		{
			title: "full-blown message",
			cfg: &config.MSTeamsV2Config{
				Title: `{{ template "msteams.default.title" . }}`,
				Text:  `{{ template "msteams.default.text" . }}`,
			},
			titleLink: `{{ template "msteamsv2.default.titleLink" . }}`,
		},
		{
			title: "title with templating errors",
			cfg: &config.MSTeamsV2Config{
				Title: "{{ ",
			},
			titleLink: `{{ template "msteamsv2.default.titleLink" . }}`,
			errMsg:    "template: :1: unclosed action",
		},
		{
			title: "message with title link templating errors",
			cfg: &config.MSTeamsV2Config{
				Title: `{{ template "msteams.default.title" . }}`,
				Text:  `{{ template "msteams.default.text" . }}`,
			},
			titleLink: `{{ `,
			errMsg:    "template: :1: unclosed action",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			tc.cfg.WebhookURL = &config.SecretURL{URL: u}
			tc.cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
			tmpl := test.CreateTmpl(t)
			pd, err := New(tc.cfg, tmpl, tc.titleLink, promslog.NewNopLogger(), newTestTemplater(tmpl))
			require.NoError(t, err)

			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			ok, err := pd.Notify(ctx, []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"lbl1": "val1",
						},
						StartsAt: time.Now(),
						EndsAt:   time.Now().Add(time.Hour),
					},
				},
			}...)
			if tc.errMsg == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.errMsg)
			}
			assert.False(t, ok)
		})
	}
}

func TestMSTeamsV2RedactedURL(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	secret := "secret"
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURL: &config.SecretURL{URL: u},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, secret)
}

func TestPrepareContent(t *testing.T) {
	t.Run("default template - firing alerts", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		notifier, err := New(
			&config.MSTeamsV2Config{
				WebhookURL: &config.SecretURL{URL: testWebhookURL},
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				Title:      "Alertname: {{ .CommonLabels.alertname }}",
			},
			tmpl,
			`{{ template "msteamsv2.default.titleLink" . }}`,
			promslog.NewNopLogger(),
			newTestTemplater(tmpl),
		)
		require.NoError(t, err)

		ctx := context.Background()
		ctx = notify.WithGroupKey(ctx, "1")

		alerts := []*types.Alert{
			{
				Alert: model.Alert{
					Labels: model.LabelSet{"alertname": "test"},
					// Custom body template
					Annotations: model.LabelSet{
						ruletypes.AnnotationBodyTemplate: "Firing alert: $alertname",
					},
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			},
		}
		blocks, err := notifier.prepareContent(ctx, alerts)
		require.NoError(t, err)
		require.Len(t, blocks, 2)
		// First block should be the title with color (firing = red)
		assert.Equal(t, "Bolder", blocks[0].Weight)
		assert.Equal(t, colorRed, blocks[0].Color)
		// verify title text
		assert.Equal(t, "Alertname: test", blocks[0].Text)
		// verify body text
		assert.Equal(t, "Firing alert: test", blocks[1].Text)
	})

	t.Run("custom template - per-alert color", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		notifier, err := New(
			&config.MSTeamsV2Config{
				WebhookURL: &config.SecretURL{URL: testWebhookURL},
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			},
			tmpl,
			`{{ template "msteamsv2.default.titleLink" . }}`,
			promslog.NewNopLogger(),
			newTestTemplater(tmpl),
		)
		require.NoError(t, err)

		ctx := context.Background()
		ctx = notify.WithGroupKey(ctx, "1")

		alerts := []*types.Alert{
			{
				Alert: model.Alert{
					Labels: model.LabelSet{"alertname": "test1"},
					Annotations: model.LabelSet{
						"summary":                         "test",
						ruletypes.AnnotationTitleTemplate: "Custom Title",
						ruletypes.AnnotationBodyTemplate:  "custom body $alertname",
					},
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			},
			{
				Alert: model.Alert{
					Labels: model.LabelSet{"alertname": "test2"},
					Annotations: model.LabelSet{
						"summary":                         "test",
						ruletypes.AnnotationTitleTemplate: "Custom Title",
						ruletypes.AnnotationBodyTemplate:  "custom body $alertname",
					},
					StartsAt: time.Now().Add(-time.Hour),
					EndsAt:   time.Now().Add(-time.Minute),
				},
			},
		}
		blocks, err := notifier.prepareContent(ctx, alerts)
		require.NoError(t, err)
		// total 3 blocks: title and 2 body blocks
		require.Len(t, blocks, 3)
		// First block: title color is overall color of the alerts
		assert.Equal(t, colorRed, blocks[0].Color)
		// verify title text
		assert.Equal(t, "Custom Title", blocks[0].Text)
		// Body blocks should have per-alert color
		assert.Equal(t, colorRed, blocks[1].Color)   // firing
		assert.Equal(t, colorGreen, blocks[2].Color) // resolved
	})
}

func TestMSTeamsV2ReadingURLFromFile(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	f, err := os.CreateTemp("", "webhook_url")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(u.String() + "\n")
	require.NoError(t, err, "writing to temp file failed")

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURLFile: f.Name(),
			HTTPConfig:     &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, u.String())
}

func TestPrepareContentChannelText(t *testing.T) {
	testCases := []struct {
		name          string
		title         string
		text          string
		annotations   model.LabelSet
		expectedTitle string
		expectedBody  []Body
	}{
		{
			name:          "CustomChannelText_Rendered",
			title:         "Team alert: {{ .CommonLabels.alertname }}",
			text:          "Service {{ range .Alerts }}{{ .Labels.service }}{{ end }} needs attention",
			expectedTitle: "Team alert: checkout errors",
			expectedBody:  []Body{{Type: "TextBlock", Text: "Service checkout needs attention", Wrap: true}},
		},
		{
			name:          "DefaultMarkers_RenderTeamsDefault",
			title:         `{{ template "msteamsv2.default.title" . }}`,
			text:          `{{ template "msteamsv2.default.text" . }}`,
			annotations:   model.LabelSet{"description": "error rate crossed 5%"},
			expectedTitle: "[FIRING:1] checkout errors",
			expectedBody: []Body{{
				Type: "TextBlock",
				Text: "**Alert:** checkout errors (critical) - firing\n\n**Description:** error rate crossed 5%\n\n**Details:**\n\n- **service:** checkout",
				Wrap: true,
			}},
		},
		{
			name:          "RuleBodyTemplate_OverridesChannelText",
			title:         "Rule wins: {{ .CommonLabels.alertname }}",
			text:          "channel text that must not appear",
			annotations:   model.LabelSet{ruletypes.AnnotationBodyTemplate: "rule body for $alertname"},
			expectedTitle: "Rule wins: checkout errors",
			expectedBody:  []Body{{Type: "TextBlock", Text: "rule body for checkout errors", Wrap: true, Color: colorRed}},
		},
		{
			name:          "EmptyText_TitleOnly",
			title:         "Only a title",
			text:          "",
			expectedTitle: "Only a title",
			expectedBody:  []Body{},
		},
		{
			name:          "WhitespaceText_TitleOnly",
			title:         "Still only a title",
			text:          "{{ if false }}never{{ end }}\n  ",
			expectedTitle: "Still only a title",
			expectedBody:  []Body{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			tmpl, err := alertmanagertypes.FromGlobs([]string{})
			require.NoError(t, err)
			tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "signoz.test"}

			notifier, err := New(
				&config.MSTeamsV2Config{
					WebhookURL: &config.SecretURL{URL: testWebhookURL},
					HTTPConfig: &commoncfg.HTTPClientConfig{},
					Title:      testCase.title,
					Text:       testCase.text,
				},
				tmpl,
				`{{ template "msteamsv2.default.titleLink" . }}`,
				promslog.NewNopLogger(),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)

			alerts := []*types.Alert{{
				Alert: model.Alert{
					Labels:      model.LabelSet{"alertname": "checkout errors", "severity": "critical", "service": "checkout", "ruleId": "0199051c-f374-71f7-a340-ec79ad81e70f"},
					Annotations: testCase.annotations,
					StartsAt:    time.Now(),
					EndsAt:      time.Now().Add(time.Hour),
				},
			}}

			blocks, err := notifier.prepareContent(notify.WithGroupKey(context.Background(), "1"), alerts)
			require.NoError(t, err)
			require.NotEmpty(t, blocks)
			assert.Equal(t, testCase.expectedTitle, blocks[0].Text)
			assert.Equal(t, colorRed, blocks[0].Color)
			assert.Equal(t, testCase.expectedBody, blocks[1:])
		})
	}
}

func TestNotifyMessageSize(t *testing.T) {
	testCases := []struct {
		name              string
		text              string
		ruleBody          string
		alertCount        int
		expectedTruncated bool
		expectedWarnLogs  int
	}{
		{
			name:              "UnderLimit_TextUntouched",
			text:              strings.Repeat("short body ", 100),
			expectedTruncated: false,
			expectedWarnLogs:  0,
		},
		{
			name:              "OverLimit_TextTrimmedToFit",
			text:              strings.Repeat("a very long body line\n\n", 4000),
			expectedTruncated: true,
			expectedWarnLogs:  1,
		},
		{
			name:              "OverLimit_EscapedCharacters_StillFits",
			text:              strings.Repeat("request to \"checkout\" failed with a timeout after several retries\n", 4000),
			expectedTruncated: true,
			expectedWarnLogs:  1,
		},
		{
			name:              "OverLimit_ManyRuleBodies_BlocksDropped",
			text:              "unused channel text",
			ruleBody:          "rule body for $alertname",
			alertCount:        600,
			expectedTruncated: true,
			expectedWarnLogs:  1,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var received []byte
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				received, _ = io.ReadAll(r.Body)
			}))
			defer srv.Close()
			u, err := url.Parse(srv.URL)
			require.NoError(t, err)

			var logs bytes.Buffer
			tmpl := test.CreateTmpl(t)
			notifier, err := New(
				&config.MSTeamsV2Config{
					WebhookURL: &config.SecretURL{URL: u},
					HTTPConfig: &commoncfg.HTTPClientConfig{},
					Title:      "size check",
					Text:       testCase.text,
				},
				tmpl,
				`{{ template "msteamsv2.default.titleLink" . }}`,
				slog.New(slog.NewTextHandler(&logs, &slog.HandlerOptions{Level: slog.LevelWarn})),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)

			alerts := make([]*types.Alert, 0, max(testCase.alertCount, 1))
			for range max(testCase.alertCount, 1) {
				alert := &types.Alert{Alert: model.Alert{Labels: model.LabelSet{"alertname": "size"}, StartsAt: time.Now(), EndsAt: time.Now().Add(time.Hour)}}
				if testCase.ruleBody != "" {
					alert.Annotations = model.LabelSet{ruletypes.AnnotationBodyTemplate: model.LabelValue(testCase.ruleBody)}
				}
				alerts = append(alerts, alert)
			}

			_, err = notifier.Notify(notify.WithGroupKey(context.Background(), "1"), alerts...)
			require.NoError(t, err)
			require.NotEmpty(t, received)
			assert.LessOrEqual(t, len(received), maxMessageBytes)
			assert.Equal(t, testCase.expectedWarnLogs, strings.Count(logs.String(), "level=WARN"))

			var message teamsMessage
			require.NoError(t, json.Unmarshal(received, &message))
			require.Len(t, message.Attachments, 1)
			body := message.Attachments[0].Content.Body
			require.NotEmpty(t, body)
			assert.Equal(t, "size check", body[0].Text)
			if testCase.alertCount > 1 {
				assert.Greater(t, len(body), 1)
				assert.Less(t, len(body), testCase.alertCount+1)
				for _, block := range body {
					assert.NotEmpty(t, block.Text)
				}
				return
			}
			require.Len(t, body, 2)
			assert.NotEmpty(t, body[1].Text)
			assert.Equal(t, testCase.expectedTruncated, len(body[1].Text) < len(strings.TrimSpace(testCase.text)))
		})
	}
}

func TestEscapeMarkdown(t *testing.T) {
	testCases := []struct {
		name     string
		value    string
		expected string
	}{
		{name: "AsteriskPair_Escaped", value: "a*b*c", expected: `a\*b\*c`},
		{name: "LinkSyntax_BracketsEscaped", value: "[runbook](https://wiki.test)", expected: `\[runbook\](https://wiki.test)`},
		{name: "UnderscoreAtWordEdges_Escaped", value: "_internal_ value", expected: `\_internal\_ value`},
		{name: "DoubleUnderscore_AllEscaped", value: "__init__", expected: `\_\_init\_\_`},
		{name: "UnderscoreInsideWord_Untouched", value: "k8s_namespace_name", expected: "k8s_namespace_name"},
		{name: "UnderscoreAfterSymbol_Escaped", value: "/api/v1/*_bulk", expected: `/api/v1/\*\_bulk`},
		{name: "TrailingUnderscore_Escaped", value: "tmp_", expected: `tmp\_`},
		{name: "NonASCIIWord_UnderscoreUntouched", value: "größe_wert", expected: "größe_wert"},
		{name: "WindowsPath_BackslashesEscaped", value: `C:\Users\x`, expected: `C:\\Users\\x`},
		{name: "UNCPath_BackslashesEscaped", value: `\\server\share`, expected: `\\\\server\\share`},
		{name: "EscapedAsterisk_BackslashAndAsteriskEscaped", value: `x\*y*`, expected: `x\\\*y\*`},
		{name: "BacktickPair_Escaped", value: "run `cmd` now", expected: "run \\`cmd\\` now"},
		{name: "TildePair_Escaped", value: "a~b~c", expected: `a\~b\~c`},
		{name: "DoubleTildePair_Escaped", value: "a~~b~~c", expected: `a\~\~b\~\~c`},
		{name: "LoneTilde_Untouched", value: "https://host.test/~user/logs", expected: "https://host.test/~user/logs"},
		{name: "HTMLAndHash_Untouched", value: "<b>tag</b> # not a heading", expected: "<b>tag</b> # not a heading"},
		{name: "Empty_Untouched", value: "", expected: ""},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, escapeMarkdown(testCase.value))
		})
	}
}

func TestEscapeLabelValues(t *testing.T) {
	startsAt := time.Unix(1700000000, 0)

	testCases := []struct {
		name                string
		alert               *types.Alert
		expectedLabels      model.LabelSet
		expectedAnnotations model.LabelSet
	}{
		{
			name: "MarkdownInLabels_CopyEscaped_OriginalUntouched",
			alert: &types.Alert{
				Alert: model.Alert{
					Labels:       model.LabelSet{"alertname": "a*b*c"},
					Annotations:  model.LabelSet{"summary": "**bold**"},
					StartsAt:     startsAt,
					EndsAt:       startsAt.Add(time.Minute),
					GeneratorURL: "https://signoz.test/alerts",
				},
				UpdatedAt: startsAt,
				Timeout:   true,
			},
			expectedLabels:      model.LabelSet{"alertname": `a\*b\*c`},
			expectedAnnotations: model.LabelSet{"summary": "**bold**"},
		},
		{
			name:                "PlainLabels_CopyUnchanged_OriginalUntouched",
			alert:               &types.Alert{Alert: model.Alert{Labels: model.LabelSet{"service": "checkout"}, Annotations: model.LabelSet{}, StartsAt: startsAt}},
			expectedLabels:      model.LabelSet{"service": "checkout"},
			expectedAnnotations: model.LabelSet{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			originalLabels := testCase.alert.Labels.Clone()
			originalAnnotations := testCase.alert.Annotations.Clone()

			escaped := escapeLabelValues([]*types.Alert{testCase.alert})
			require.Len(t, escaped, 1)

			assert.Equal(t, testCase.expectedLabels, escaped[0].Labels)
			assert.Equal(t, testCase.expectedAnnotations, escaped[0].Annotations)
			assert.Equal(t, testCase.alert.StartsAt, escaped[0].StartsAt)
			assert.Equal(t, testCase.alert.EndsAt, escaped[0].EndsAt)
			assert.Equal(t, testCase.alert.GeneratorURL, escaped[0].GeneratorURL)
			assert.Equal(t, testCase.alert.UpdatedAt, escaped[0].UpdatedAt)
			assert.Equal(t, testCase.alert.Timeout, escaped[0].Timeout)

			escaped[0].Annotations["added"] = "x"
			escaped[0].Labels["added"] = "x"
			assert.Equal(t, originalLabels, testCase.alert.Labels)
			assert.Equal(t, originalAnnotations, testCase.alert.Annotations)
		})
	}
}

func TestPrepareContentEscapesLabelValues(t *testing.T) {
	testCases := []struct {
		name          string
		title         string
		text          string
		annotations   model.LabelSet
		expectedTitle string
		expectedBody  string
	}{
		{
			name:          "DefaultTemplates_AlertNameAndDetailsEscaped",
			title:         `{{ template "msteamsv2.default.title" . }}`,
			text:          `{{ template "msteamsv2.default.text" . }}`,
			expectedTitle: `[FIRING:1] CPU \*high\* \[prod\]`,
			expectedBody:  "**Alert:** CPU \\*high\\* \\[prod\\] (critical) - firing\n\n**Details:**\n\n- **expr:** rate(a\\[5m\\]) \\* 2\n- **k8s_pod_name:** api_server_1",
		},
		{
			name:          "CustomChannelTemplates_LabelValuesEscaped",
			title:         "Custom: {{ .CommonLabels.alertname }}",
			text:          "{{ range .Alerts }}expr={{ .Labels.expr }} pod={{ .Labels.k8s_pod_name }}{{ end }}",
			expectedTitle: `Custom: CPU \*high\* \[prod\]`,
			expectedBody:  `expr=rate(a\[5m\]) \* 2 pod=api_server_1`,
		},
		{
			name:          "CustomChannelTemplates_GroupLabelValuesEscaped",
			title:         "Group: {{ .GroupLabels.alertname }}",
			text:          "{{ .GroupLabels.alertname }} from {{ .GroupLabels.ruleSource }}",
			expectedTitle: `Group: CPU \*high\* \[prod\]`,
			expectedBody:  `CPU \*high\* \[prod\] from https://signoz.test/alerts/overview?ruleId=[x]_`,
		},
		{
			name:          "RuleBodyTemplate_LabelValuesEscaped",
			title:         "Rule: {{ .CommonLabels.alertname }}",
			text:          "unused channel text",
			annotations:   model.LabelSet{ruletypes.AnnotationBodyTemplate: "expr is $expr"},
			expectedTitle: `Rule: CPU \*high\* \[prod\]`,
			expectedBody:  `expr is rate(a\[5m\]) \* 2`,
		},
		{
			name:          "AnnotationValues_LeftAsWritten",
			title:         "Annotations: {{ .CommonLabels.severity }}",
			text:          "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}",
			annotations:   model.LabelSet{"summary": "see **the** [runbook](https://wiki.test) for a*b"},
			expectedTitle: "Annotations: critical",
			expectedBody:  "see **the** [runbook](https://wiki.test) for a*b",
		},
		{
			name:          "RuleSourceLabel_LeftAsWritten",
			title:         "Source: {{ .CommonLabels.severity }}",
			text:          "{{ range .Alerts }}[open]({{ .Labels.ruleSource }}){{ end }}",
			expectedTitle: "Source: critical",
			expectedBody:  "[open](https://signoz.test/alerts/overview?ruleId=[x]_)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			tmpl, err := alertmanagertypes.FromGlobs([]string{})
			require.NoError(t, err)
			tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "signoz.test"}

			notifier, err := New(
				&config.MSTeamsV2Config{
					WebhookURL: &config.SecretURL{URL: testWebhookURL},
					HTTPConfig: &commoncfg.HTTPClientConfig{},
					Title:      testCase.title,
					Text:       testCase.text,
				},
				tmpl,
				`{{ template "msteamsv2.default.titleLink" . }}`,
				promslog.NewNopLogger(),
				newTestTemplater(tmpl),
			)
			require.NoError(t, err)

			alerts := []*types.Alert{{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"alertname": "CPU *high* [prod]", "severity": "critical", "expr": "rate(a[5m]) * 2", "k8s_pod_name": "api_server_1",
						"ruleSource": "https://signoz.test/alerts/overview?ruleId=[x]_",
					},
					Annotations: testCase.annotations,
					StartsAt:    time.Now(),
					EndsAt:      time.Now().Add(time.Hour),
				},
			}}

			groupLabels := model.LabelSet{"alertname": "CPU *high* [prod]", "ruleSource": "https://signoz.test/alerts/overview?ruleId=[x]_"}
			ctx := notify.WithGroupLabels(notify.WithGroupKey(context.Background(), "1"), groupLabels)

			blocks, err := notifier.prepareContent(ctx, alerts)
			require.NoError(t, err)
			require.Len(t, blocks, 2)
			assert.Equal(t, testCase.expectedTitle, blocks[0].Text)
			assert.Equal(t, testCase.expectedBody, blocks[1].Text)
			assert.Equal(t, model.LabelValue("CPU *high* [prod]"), groupLabels["alertname"])
			assert.Equal(t, model.LabelValue("CPU *high* [prod]"), alerts[0].Labels["alertname"])
			assert.Equal(t, model.LabelValue("rate(a[5m]) * 2"), alerts[0].Labels["expr"])
		})
	}
}
