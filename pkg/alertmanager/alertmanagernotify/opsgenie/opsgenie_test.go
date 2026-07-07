// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package opsgenie

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
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

func TestOpsGenieRetry(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.OpsGenieConfig{
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	retryCodes := append(test.DefaultRetryCodes(), http.StatusTooManyRequests)
	for statusCode, expected := range test.RetryTests(retryCodes) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "error on status %d", statusCode)
	}
}

func TestOpsGenieRedactedURL(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	key := "key"
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.OpsGenieConfig{
			APIURL:     &config.URL{URL: u},
			APIKey:     config.Secret(key),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestGettingOpsGegineApikeyFromFile(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	key := "key"

	f, err := os.CreateTemp(t.TempDir(), "opsgenie_test")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(key)
	require.NoError(t, err, "writing to temp file failed")

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.OpsGenieConfig{
			APIURL:     &config.URL{URL: u},
			APIKeyFile: f.Name(),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestOpsGenie(t *testing.T) {
	u, err := url.Parse("https://opsgenie/api")
	if err != nil {
		t.Fatalf("failed to parse URL: %v", err)
	}
	logger := promslog.NewNopLogger()
	tmpl := test.CreateTmpl(t)

	for _, tc := range []struct {
		title string
		cfg   *config.OpsGenieConfig

		expectedEmptyAlertBody string
		expectedBody           string
	}{
		{
			title: "config without details",
			cfg: &config.OpsGenieConfig{
				NotifierConfig: config.NotifierConfig{
					VSendResolved: true,
				},
				Message:     `{{ .CommonLabels.Message }}`,
				Description: `{{ .CommonLabels.Description }}`,
				Source:      `{{ .CommonLabels.Source }}`,
				Responders: []config.OpsGenieConfigResponder{
					{
						Name: `{{ .CommonLabels.ResponderName1 }}`,
						Type: `{{ .CommonLabels.ResponderType1 }}`,
					},
					{
						Name: `{{ .CommonLabels.ResponderName2 }}`,
						Type: `{{ .CommonLabels.ResponderType2 }}`,
					},
				},
				Tags:       `{{ .CommonLabels.Tags }}`,
				Note:       `{{ .CommonLabels.Note }}`,
				Priority:   `{{ .CommonLabels.Priority }}`,
				Entity:     `{{ .CommonLabels.Entity }}`,
				Actions:    `{{ .CommonLabels.Actions }}`,
				APIKey:     `{{ .ExternalURL }}`,
				APIURL:     &config.URL{URL: u},
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			},
			expectedEmptyAlertBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"","details":{},"source":""}
`,
			expectedBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"message","description":"description","details":{"Actions":"doThis,doThat","Description":"description","Entity":"test-domain","Message":"message","Note":"this is a note","Priority":"P1","ResponderName1":"TeamA","ResponderName2":"EscalationA","ResponderName3":"TeamA,TeamB","ResponderType1":"team","ResponderType2":"escalation","ResponderType3":"teams","Source":"http://prometheus","Tags":"tag1,tag2"},"source":"http://prometheus","responders":[{"name":"TeamA","type":"team"},{"name":"EscalationA","type":"escalation"}],"tags":["tag1","tag2"],"note":"this is a note","priority":"P1","entity":"test-domain","actions":["doThis","doThat"]}
`,
		},
		{
			title: "config with details",
			cfg: &config.OpsGenieConfig{
				NotifierConfig: config.NotifierConfig{
					VSendResolved: true,
				},
				Message:     `{{ .CommonLabels.Message }}`,
				Description: `{{ .CommonLabels.Description }}`,
				Source:      `{{ .CommonLabels.Source }}`,
				Details: map[string]string{
					"Description": `adjusted {{ .CommonLabels.Description }}`,
				},
				Responders: []config.OpsGenieConfigResponder{
					{
						Name: `{{ .CommonLabels.ResponderName1 }}`,
						Type: `{{ .CommonLabels.ResponderType1 }}`,
					},
					{
						Name: `{{ .CommonLabels.ResponderName2 }}`,
						Type: `{{ .CommonLabels.ResponderType2 }}`,
					},
				},
				Tags:       `{{ .CommonLabels.Tags }}`,
				Note:       `{{ .CommonLabels.Note }}`,
				Priority:   `{{ .CommonLabels.Priority }}`,
				Entity:     `{{ .CommonLabels.Entity }}`,
				Actions:    `{{ .CommonLabels.Actions }}`,
				APIKey:     `{{ .ExternalURL }}`,
				APIURL:     &config.URL{URL: u},
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			},
			expectedEmptyAlertBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"","details":{"Description":"adjusted "},"source":""}
`,
			expectedBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"message","description":"description","details":{"Actions":"doThis,doThat","Description":"adjusted description","Entity":"test-domain","Message":"message","Note":"this is a note","Priority":"P1","ResponderName1":"TeamA","ResponderName2":"EscalationA","ResponderName3":"TeamA,TeamB","ResponderType1":"team","ResponderType2":"escalation","ResponderType3":"teams","Source":"http://prometheus","Tags":"tag1,tag2"},"source":"http://prometheus","responders":[{"name":"TeamA","type":"team"},{"name":"EscalationA","type":"escalation"}],"tags":["tag1","tag2"],"note":"this is a note","priority":"P1","entity":"test-domain","actions":["doThis","doThat"]}
`,
		},
		{
			title: "config with multiple teams",
			cfg: &config.OpsGenieConfig{
				NotifierConfig: config.NotifierConfig{
					VSendResolved: true,
				},
				Message:     `{{ .CommonLabels.Message }}`,
				Description: `{{ .CommonLabels.Description }}`,
				Source:      `{{ .CommonLabels.Source }}`,
				Details: map[string]string{
					"Description": `adjusted {{ .CommonLabels.Description }}`,
				},
				Responders: []config.OpsGenieConfigResponder{
					{
						Name: `{{ .CommonLabels.ResponderName3 }}`,
						Type: `{{ .CommonLabels.ResponderType3 }}`,
					},
				},
				Tags:       `{{ .CommonLabels.Tags }}`,
				Note:       `{{ .CommonLabels.Note }}`,
				Priority:   `{{ .CommonLabels.Priority }}`,
				APIKey:     `{{ .ExternalURL }}`,
				APIURL:     &config.URL{URL: u},
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			},
			expectedEmptyAlertBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"","details":{"Description":"adjusted "},"source":""}
`,
			expectedBody: `{"alias":"6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b","message":"message","description":"description","details":{"Actions":"doThis,doThat","Description":"adjusted description","Entity":"test-domain","Message":"message","Note":"this is a note","Priority":"P1","ResponderName1":"TeamA","ResponderName2":"EscalationA","ResponderName3":"TeamA,TeamB","ResponderType1":"team","ResponderType2":"escalation","ResponderType3":"teams","Source":"http://prometheus","Tags":"tag1,tag2"},"source":"http://prometheus","responders":[{"name":"TeamA","type":"team"},{"name":"TeamB","type":"team"}],"tags":["tag1","tag2"],"note":"this is a note","priority":"P1"}
`,
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			notifier, err := New(tc.cfg, tmpl, logger, newTestTemplater(tmpl))
			require.NoError(t, err)

			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			expectedURL, _ := url.Parse("https://opsgenie/apiv2/alerts")

			// Empty alert.
			alert1 := &types.Alert{
				Alert: model.Alert{
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}

			req, retry, err := notifier.createRequests(ctx, alert1)
			require.NoError(t, err)
			require.Len(t, req, 1)
			require.True(t, retry)
			require.Equal(t, expectedURL, req[0].URL)
			require.Equal(t, "GenieKey http://am", req[0].Header.Get("Authorization"))
			require.Equal(t, tc.expectedEmptyAlertBody, readBody(t, req[0]))

			// Fully defined alert.
			alert2 := &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"Message":        "message",
						"Description":    "description",
						"Source":         "http://prometheus",
						"ResponderName1": "TeamA",
						"ResponderType1": "team",
						"ResponderName2": "EscalationA",
						"ResponderType2": "escalation",
						"ResponderName3": "TeamA,TeamB",
						"ResponderType3": "teams",
						"Tags":           "tag1,tag2",
						"Note":           "this is a note",
						"Priority":       "P1",
						"Entity":         "test-domain",
						"Actions":        "doThis,doThat",
					},
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}
			req, retry, err = notifier.createRequests(ctx, alert2)
			require.NoError(t, err)
			require.True(t, retry)
			require.Len(t, req, 1)
			require.Equal(t, tc.expectedBody, readBody(t, req[0]))

			// Broken API Key Template.
			tc.cfg.APIKey = "{{ kaput "
			_, _, err = notifier.createRequests(ctx, alert2)
			require.Error(t, err)
			require.Equal(t, "template: :1: function \"kaput\" not defined", err.Error())
		})
	}
}

func TestOpsGenieWithUpdate(t *testing.T) {
	u, err := url.Parse("https://test-opsgenie-url")
	require.NoError(t, err)
	tmpl := test.CreateTmpl(t)
	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "1")
	opsGenieConfigWithUpdate := config.OpsGenieConfig{
		Message:      `{{ .CommonLabels.Message }}`,
		Description:  `{{ .CommonLabels.Description }}`,
		UpdateAlerts: true,
		APIKey:       "test-api-key",
		APIURL:       &config.URL{URL: u},
		HTTPConfig:   &commoncfg.HTTPClientConfig{},
	}
	notifierWithUpdate, err := New(&opsGenieConfigWithUpdate, tmpl, promslog.NewNopLogger(), newTestTemplater(tmpl))
	alert := &types.Alert{
		Alert: model.Alert{
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
			Labels: model.LabelSet{
				"Message":     "new message",
				"Description": "new description",
			},
		},
	}
	require.NoError(t, err)
	requests, retry, err := notifierWithUpdate.createRequests(ctx, alert)
	require.NoError(t, err)
	require.True(t, retry)
	require.Len(t, requests, 3)

	body0 := readBody(t, requests[0])
	body1 := readBody(t, requests[1])
	body2 := readBody(t, requests[2])
	key, _ := notify.ExtractGroupKey(ctx)
	alias := key.Hash()

	require.Equal(t, "https://test-opsgenie-url/v2/alerts", requests[0].URL.String())
	require.NotEmpty(t, body0)

	require.Equal(t, requests[1].URL.String(), fmt.Sprintf("https://test-opsgenie-url/v2/alerts/%s/message?identifierType=alias", alias))
	require.JSONEq(t, `{"message":"new message"}`, body1)
	require.Equal(t, requests[2].URL.String(), fmt.Sprintf("https://test-opsgenie-url/v2/alerts/%s/description?identifierType=alias", alias))
	require.JSONEq(t, `{"description":"new description"}`, body2)
}

func TestOpsGenieApiKeyFile(t *testing.T) {
	u, err := url.Parse("https://test-opsgenie-url")
	require.NoError(t, err)
	tmpl := test.CreateTmpl(t)
	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "1")
	opsGenieConfigWithUpdate := config.OpsGenieConfig{
		APIKeyFile: `./api_key_file`,
		APIURL:     &config.URL{URL: u},
		HTTPConfig: &commoncfg.HTTPClientConfig{},
	}
	notifierWithUpdate, err := New(&opsGenieConfigWithUpdate, tmpl, promslog.NewNopLogger(), newTestTemplater(tmpl))

	require.NoError(t, err)
	requests, _, err := notifierWithUpdate.createRequests(ctx)
	require.NoError(t, err)
	require.Equal(t, "GenieKey my_secret_api_key", requests[0].Header.Get("Authorization"))
}

func TestPrepareContent(t *testing.T) {
	t.Run("default template", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		logger := promslog.NewNopLogger()

		notifier := &Notifier{
			conf: &config.OpsGenieConfig{
				Message:     `{{ .CommonLabels.Message }}`,
				Description: `{{ .CommonLabels.Description }}`,
			},
			tmpl:      tmpl,
			logger:    logger,
			templater: newTestTemplater(tmpl),
		}

		ctx := context.Background()
		ctx = notify.WithGroupKey(ctx, "1")

		alert := &types.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"Message":     "Firing alert: test",
					"Description": "Check runbook for more details",
				},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			},
		}

		alerts := []*types.Alert{alert}

		title, desc, prepErr := notifier.prepareContent(ctx, alerts)
		require.NoError(t, prepErr)
		require.Equal(t, "Firing alert: test", title)
		require.Equal(t, "Check runbook for more details", desc)
	})

	t.Run("custom template", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		logger := promslog.NewNopLogger()

		notifier := &Notifier{
			conf: &config.OpsGenieConfig{
				Message:     `{{ .CommonLabels.Message }}`,
				Description: `{{ .CommonLabels.Description }}`,
			},
			tmpl:      tmpl,
			logger:    logger,
			templater: newTestTemplater(tmpl),
		}

		ctx := context.Background()
		ctx = notify.WithGroupKey(ctx, "1")

		alert1 := &types.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"service":   "payment",
					"namespace": "potter-the-harry",
				},
				Annotations: model.LabelSet{
					ruletypes.AnnotationTitleTemplate: "High request throughput for $service",
					ruletypes.AnnotationBodyTemplate:  "Alert firing in NS: $labels.namespace",
				},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			},
		}
		alert2 := &types.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"service":   "payment",
					"namespace": "smart-the-rat",
				},
				Annotations: model.LabelSet{
					ruletypes.AnnotationTitleTemplate: "High request throughput for $service",
					ruletypes.AnnotationBodyTemplate:  "Alert firing in NS: $labels.namespace",
				},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			},
		}

		alerts := []*types.Alert{alert1, alert2}

		title, desc, err := notifier.prepareContent(ctx, alerts)
		require.NoError(t, err)
		require.Equal(t, "High request throughput for payment", title)
		// Each alert body wrapped in <div>, separated by <hr>
		require.Equal(t, "<div><p>Alert firing in NS: potter-the-harry</p>\n</div><hr><div><p>Alert firing in NS: smart-the-rat</p>\n</div>", desc)
	})
}

func readBody(t *testing.T, r *http.Request) string {
	t.Helper()
	body, err := io.ReadAll(r.Body)
	require.NoError(t, err)
	return string(body)
}
