// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package pagerduty

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
	"github.com/SigNoz/signoz/pkg/errors"
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

func TestPagerDutyRetryV1(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			ServiceKey: config.Secret("01234567890123456789012345678901"),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	retryCodes := append(test.DefaultRetryCodes(), http.StatusForbidden)
	for statusCode, expected := range test.RetryTests(retryCodes) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "retryv1 - error on status %d", statusCode)
	}
}

func TestPagerDutyRetryV2(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			RoutingKey: config.Secret("01234567890123456789012345678901"),
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
		require.Equal(t, expected, actual, "retryv2 - error on status %d", statusCode)
	}
}

func TestPagerDutyRedactedURLV1(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	key := "01234567890123456789012345678901"
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			ServiceKey: config.Secret(key),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)
	notifier.apiV1 = u.String()

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestPagerDutyRedactedURLV2(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	key := "01234567890123456789012345678901"
	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			URL:        &config.URL{URL: u},
			RoutingKey: config.Secret(key),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestPagerDutyV1ServiceKeyFromFile(t *testing.T) {
	key := "01234567890123456789012345678901"
	f, err := os.CreateTemp(t.TempDir(), "pagerduty_test")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(key)
	require.NoError(t, err, "writing to temp file failed")

	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			ServiceKeyFile: f.Name(),
			HTTPConfig:     &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)
	notifier.apiV1 = u.String()

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestPagerDutyV2RoutingKeyFromFile(t *testing.T) {
	key := "01234567890123456789012345678901"
	f, err := os.CreateTemp(t.TempDir(), "pagerduty_test")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(key)
	require.NoError(t, err, "writing to temp file failed")

	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	tmpl := test.CreateTmpl(t)
	notifier, err := New(
		&config.PagerdutyConfig{
			URL:            &config.URL{URL: u},
			RoutingKeyFile: f.Name(),
			HTTPConfig:     &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, key)
}

func TestPagerDutyTemplating(t *testing.T) {
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
		title string
		cfg   *config.PagerdutyConfig

		retry  bool
		errMsg string
	}{
		{
			title: "full-blown legacy message",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Images: []config.PagerdutyImage{
					{
						Src:  "{{ .Status }}",
						Alt:  "{{ .Status }}",
						Href: "{{ .Status }}",
					},
				},
				Links: []config.PagerdutyLink{
					{
						Href: "{{ .Status }}",
						Text: "{{ .Status }}",
					},
				},
				Details: map[string]any{
					"firing":       `{{ .Alerts.Firing | toJson }}`,
					"resolved":     `{{ .Alerts.Resolved | toJson }}`,
					"num_firing":   `{{ .Alerts.Firing | len }}`,
					"num_resolved": `{{ .Alerts.Resolved | len }}`,
				},
			},
		},
		{
			title: "full-blown legacy message",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Images: []config.PagerdutyImage{
					{
						Src:  "{{ .Status }}",
						Alt:  "{{ .Status }}",
						Href: "{{ .Status }}",
					},
				},
				Links: []config.PagerdutyLink{
					{
						Href: "{{ .Status }}",
						Text: "{{ .Status }}",
					},
				},
				Details: map[string]any{
					"firing":       `{{ template "pagerduty.default.instances" .Alerts.Firing }}`,
					"resolved":     `{{ template "pagerduty.default.instances" .Alerts.Resolved }}`,
					"num_firing":   `{{ .Alerts.Firing | len }}`,
					"num_resolved": `{{ .Alerts.Resolved | len }}`,
				},
			},
		},
		{
			title: "nested details",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Details: map[string]any{
					"a": map[string]any{
						"b": map[string]any{
							"c": map[string]any{
								"firing":       `{{ .Alerts.Firing | toJson }}`,
								"resolved":     `{{ .Alerts.Resolved | toJson }}`,
								"num_firing":   `{{ .Alerts.Firing | len }}`,
								"num_resolved": `{{ .Alerts.Resolved | len }}`,
							},
						},
					},
				},
			},
		},
		{
			title: "nested details with template error",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Details: map[string]any{
					"a": map[string]any{
						"b": map[string]any{
							"c": map[string]any{
								"firing": `{{ template "pagerduty.default.instances" .Alerts.Firing`,
							},
						},
					},
				},
			},
			errMsg: "failed to render details: template: :1: unclosed action",
		},
		{
			title: "details with templating errors",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Details: map[string]any{
					"firing":       `{{ .Alerts.Firing | toJson`,
					"resolved":     `{{ .Alerts.Resolved | toJson }}`,
					"num_firing":   `{{ .Alerts.Firing | len }}`,
					"num_resolved": `{{ .Alerts.Resolved | len }}`,
				},
			},
			errMsg: "failed to render details: template: :1: unclosed action",
		},
		{
			title: "v2 message with templating errors",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				Severity:   "{{ ",
			},
			errMsg: "failed to template",
		},
		{
			title: "v1 message with templating errors",
			cfg: &config.PagerdutyConfig{
				ServiceKey: config.Secret("01234567890123456789012345678901"),
				Client:     "{{ ",
			},
			errMsg: "failed to template",
		},
		{
			title: "routing key cannot be empty",
			cfg: &config.PagerdutyConfig{
				RoutingKey: config.Secret(`{{ "" }}`),
			},
			errMsg: "routing key cannot be empty",
		},
		{
			title: "service_key cannot be empty",
			cfg: &config.PagerdutyConfig{
				ServiceKey: config.Secret(`{{ "" }}`),
			},
			errMsg: "service key cannot be empty",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			tc.cfg.URL = &config.URL{URL: u}
			tc.cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
			tmpl := test.CreateTmpl(t)
			pd, err := New(tc.cfg, tmpl, promslog.NewNopLogger(), newTestTemplater(tmpl))
			require.NoError(t, err)
			if pd.apiV1 != "" {
				pd.apiV1 = u.String()
			}

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
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				if errors.Asc(err, errors.CodeInternal) {
					_, _, errMsg, _, _, _ := errors.Unwrapb(err)
					require.Contains(t, errMsg, tc.errMsg)
				} else {
					require.Contains(t, err.Error(), tc.errMsg)
				}
			}
			require.Equal(t, tc.retry, ok)
		})
	}
}

func TestErrDetails(t *testing.T) {
	for _, tc := range []struct {
		status int
		body   io.Reader

		exp string
	}{
		{
			status: http.StatusBadRequest,
			body: bytes.NewBuffer([]byte(
				`{"status":"invalid event","message":"Event object is invalid","errors":["Length of 'routing_key' is incorrect (should be 32 characters)"]}`,
			)),

			exp: "Length of 'routing_key' is incorrect",
		},
		{
			status: http.StatusBadRequest,
			body:   bytes.NewBuffer([]byte(`{"status"}`)),

			exp: "",
		},
		{
			status: http.StatusBadRequest,

			exp: "",
		},
		{
			status: http.StatusTooManyRequests,

			exp: "",
		},
	} {
		t.Run("", func(t *testing.T) {
			err := errDetails(tc.status, tc.body)
			require.Contains(t, err, tc.exp)
		})
	}
}

func TestEventSizeEnforcement(t *testing.T) {
	bigDetailsV1 := map[string]any{
		"firing": strings.Repeat("a", 513000),
	}
	bigDetailsV2 := map[string]any{
		"firing": strings.Repeat("a", 513000),
	}

	// V1 Messages
	msgV1 := &pagerDutyMessage{
		ServiceKey: "01234567890123456789012345678901",
		EventType:  "trigger",
		Details:    bigDetailsV1,
	}

	tmpl := test.CreateTmpl(t)
	notifierV1, err := New(
		&config.PagerdutyConfig{
			ServiceKey: config.Secret("01234567890123456789012345678901"),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	encodedV1, err := notifierV1.encodeMessage(context.Background(), msgV1)
	require.NoError(t, err)
	require.Contains(t, encodedV1.String(), `"details":{"error":"Custom details have been removed because the original event exceeds the maximum size of 512KB"}`)

	// V2 Messages
	msgV2 := &pagerDutyMessage{
		RoutingKey:  "01234567890123456789012345678901",
		EventAction: "trigger",
		Payload: &pagerDutyPayload{
			CustomDetails: bigDetailsV2,
		},
	}

	notifierV2, err := New(
		&config.PagerdutyConfig{
			RoutingKey: config.Secret("01234567890123456789012345678901"),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		tmpl,
		promslog.NewNopLogger(),
		newTestTemplater(tmpl),
	)
	require.NoError(t, err)

	encodedV2, err := notifierV2.encodeMessage(context.Background(), msgV2)
	require.NoError(t, err)
	require.Contains(t, encodedV2.String(), `"custom_details":{"error":"Custom details have been removed because the original event exceeds the maximum size of 512KB"}`)
}

func TestPagerDutyEmptySrcHref(t *testing.T) {
	type pagerDutyEvent struct {
		RoutingKey  string           `json:"routing_key"`
		EventAction string           `json:"event_action"`
		DedupKey    string           `json:"dedup_key"`
		Payload     pagerDutyPayload `json:"payload"`
		Images      []pagerDutyImage
		Links       []pagerDutyLink
	}

	images := []config.PagerdutyImage{
		{
			Src:  "",
			Alt:  "Empty src",
			Href: "https://example.com/",
		},
		{
			Src:  "https://example.com/cat.jpg",
			Alt:  "Empty href",
			Href: "",
		},
		{
			Src:  "https://example.com/cat.jpg",
			Alt:  "",
			Href: "https://example.com/",
		},
	}

	links := []config.PagerdutyLink{
		{
			Href: "",
			Text: "Empty href",
		},
		{
			Href: "https://example.com/",
			Text: "",
		},
	}

	expectedImages := make([]pagerDutyImage, 0, len(images))
	for _, image := range images {
		if image.Src == "" {
			continue
		}
		expectedImages = append(expectedImages, pagerDutyImage{
			Src:  image.Src,
			Alt:  image.Alt,
			Href: image.Href,
		})
	}

	expectedLinks := make([]pagerDutyLink, 0, len(links))
	for _, link := range links {
		if link.Href == "" {
			continue
		}
		expectedLinks = append(expectedLinks, pagerDutyLink{
			HRef: link.Href,
			Text: link.Text,
		})
	}

	server := httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			decoder := json.NewDecoder(r.Body)
			var event pagerDutyEvent
			if err := decoder.Decode(&event); err != nil {
				panic(err)
			}

			if event.RoutingKey == "" || event.EventAction == "" {
				http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
				return
			}

			for _, image := range event.Images {
				if image.Src == "" {
					http.Error(w, "Event object is invalid: 'image src' is missing or blank", http.StatusBadRequest)
					return
				}
			}

			for _, link := range event.Links {
				if link.HRef == "" {
					http.Error(w, "Event object is invalid: 'link href' is missing or blank", http.StatusBadRequest)
					return
				}
			}

			require.Equal(t, expectedImages, event.Images)
			require.Equal(t, expectedLinks, event.Links)
		},
	))
	defer server.Close()

	url, err := url.Parse(server.URL)
	require.NoError(t, err)

	pagerDutyConfig := config.PagerdutyConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		RoutingKey: config.Secret("01234567890123456789012345678901"),
		URL:        &config.URL{URL: url},
		Images:     images,
		Links:      links,
	}

	pdTmpl := test.CreateTmpl(t)
	pagerDuty, err := New(&pagerDutyConfig, pdTmpl, promslog.NewNopLogger(), newTestTemplater(pdTmpl))
	require.NoError(t, err)

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "1")

	_, err = pagerDuty.Notify(ctx, []*types.Alert{
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
	require.NoError(t, err)
}

func TestPagerDutyTimeout(t *testing.T) {
	type pagerDutyEvent struct {
		RoutingKey  string           `json:"routing_key"`
		EventAction string           `json:"event_action"`
		DedupKey    string           `json:"dedup_key"`
		Payload     pagerDutyPayload `json:"payload"`
		Images      []pagerDutyImage
		Links       []pagerDutyLink
	}

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
			srv := httptest.NewServer(http.HandlerFunc(
				func(w http.ResponseWriter, r *http.Request) {
					decoder := json.NewDecoder(r.Body)
					var event pagerDutyEvent
					if err := decoder.Decode(&event); err != nil {
						panic(err)
					}

					if event.RoutingKey == "" || event.EventAction == "" {
						http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
						return
					}
					time.Sleep(tt.latency)
				},
			))
			defer srv.Close()
			u, err := url.Parse(srv.URL)
			require.NoError(t, err)

			cfg := config.PagerdutyConfig{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				URL:        &config.URL{URL: u},
				Timeout:    tt.timeout,
			}

			tmpl := test.CreateTmpl(t)
			pd, err := New(&cfg, tmpl, promslog.NewNopLogger(), newTestTemplater(tmpl))
			require.NoError(t, err)

			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")
			alert := &types.Alert{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"lbl1": "val1",
					},
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}
			_, err = pd.Notify(ctx, alert)
			require.Equal(t, tt.wantErr, err != nil)
		})
	}
}

func TestRenderDetails(t *testing.T) {
	type args struct {
		details map[string]any
		data    *template.Data
	}
	tests := []struct {
		name    string
		args    args
		want    map[string]any
		wantErr bool
	}{
		{
			name: "flat",
			args: args{
				details: map[string]any{
					"a": "{{ .Status }}",
					"b": "String",
				},
				data: &template.Data{
					Status: "Flat",
				},
			},
			want: map[string]any{
				"a": "Flat",
				"b": "String",
			},
			wantErr: false,
		},
		{
			name: "flat error",
			args: args{
				details: map[string]any{
					"a": "{{ .Status",
				},
				data: &template.Data{
					Status: "Error",
				},
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "nested",
			args: args{
				details: map[string]any{
					"a": map[string]any{
						"b": map[string]any{
							"c": "{{ .Status }}",
							"d": "String",
						},
					},
				},
				data: &template.Data{
					Status: "Nested",
				},
			},
			want: map[string]any{
				"a": map[string]any{
					"b": map[string]any{
						"c": "Nested",
						"d": "String",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "nested error",
			args: args{
				details: map[string]any{
					"a": map[string]any{
						"b": map[string]any{
							"c": "{{ .Status",
						},
					},
				},
				data: &template.Data{
					Status: "Error",
				},
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "alerts",
			args: args{
				details: map[string]any{
					"alerts": map[string]any{
						"firing":       "{{ .Alerts.Firing | toJson }}",
						"resolved":     "{{ .Alerts.Resolved | toJson }}",
						"num_firing":   "{{ len .Alerts.Firing }}",
						"num_resolved": "{{ len .Alerts.Resolved }}",
					},
				},
				data: &template.Data{
					Alerts: template.Alerts{
						{
							Status: "firing",
							Annotations: template.KV{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							Labels: template.KV{
								"alertname": "Firing1",
								"label1":    "value1",
								"label2":    "value2",
							},
							Fingerprint:  "fingerprint1",
							GeneratorURL: "http://generator1",
							StartsAt:     time.Date(2001, time.January, 1, 0, 0, 0, 0, time.UTC),
							EndsAt:       time.Date(2001, time.January, 1, 1, 0, 0, 0, time.UTC),
						},
						{
							Status: "firing",
							Annotations: template.KV{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							Labels: template.KV{
								"alertname": "Firing2",
								"label1":    "value1",
								"label2":    "value2",
							},
							Fingerprint:  "fingerprint2",
							GeneratorURL: "http://generator2",
							StartsAt:     time.Date(2002, time.January, 1, 0, 0, 0, 0, time.UTC),
							EndsAt:       time.Date(2002, time.January, 1, 1, 0, 0, 0, time.UTC),
						},
						{
							Status: "resolved",
							Annotations: template.KV{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							Labels: template.KV{
								"alertname": "Resolved1",
								"label1":    "value1",
								"label2":    "value2",
							},
							Fingerprint:  "fingerprint3",
							GeneratorURL: "http://generator3",
							StartsAt:     time.Date(2001, time.January, 1, 0, 0, 0, 0, time.UTC),
							EndsAt:       time.Date(2001, time.January, 1, 1, 0, 0, 0, time.UTC),
						},
						{
							Status: "resolved",
							Annotations: template.KV{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							Labels: template.KV{
								"alertname": "Resolved2",
								"label1":    "value1",
								"label2":    "value2",
							},
							Fingerprint:  "fingerprint4",
							GeneratorURL: "http://generator4",
							StartsAt:     time.Date(2002, time.January, 1, 0, 0, 0, 0, time.UTC),
							EndsAt:       time.Date(2002, time.January, 1, 1, 0, 0, 0, time.UTC),
						},
					},
				},
			},
			want: map[string]any{
				"alerts": map[string]any{
					"firing": []any{
						map[string]any{
							"status": "firing",
							"labels": map[string]any{
								"alertname": "Firing1",
								"label1":    "value1",
								"label2":    "value2",
							},
							"annotations": map[string]any{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							"startsAt":     time.Date(2001, time.January, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"endsAt":       time.Date(2001, time.January, 1, 1, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"fingerprint":  "fingerprint1",
							"generatorURL": "http://generator1",
						},
						map[string]any{
							"status": "firing",
							"labels": map[string]any{
								"alertname": "Firing2",
								"label1":    "value1",
								"label2":    "value2",
							},
							"annotations": map[string]any{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							"startsAt":     time.Date(2002, time.January, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"endsAt":       time.Date(2002, time.January, 1, 1, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"fingerprint":  "fingerprint2",
							"generatorURL": "http://generator2",
						},
					},
					"resolved": []any{
						map[string]any{
							"status": "resolved",
							"labels": map[string]any{
								"alertname": "Resolved1",
								"label1":    "value1",
								"label2":    "value2",
							},
							"annotations": map[string]any{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							"startsAt":     time.Date(2001, time.January, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"endsAt":       time.Date(2001, time.January, 1, 1, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"fingerprint":  "fingerprint3",
							"generatorURL": "http://generator3",
						},
						map[string]any{
							"status": "resolved",
							"labels": map[string]any{
								"alertname": "Resolved2",
								"label1":    "value1",
								"label2":    "value2",
							},
							"annotations": map[string]any{
								"annotation1": "value1",
								"annotation2": "value2",
							},
							"startsAt":     time.Date(2002, time.January, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"endsAt":       time.Date(2002, time.January, 1, 1, 0, 0, 0, time.UTC).Format(time.RFC3339),
							"fingerprint":  "fingerprint4",
							"generatorURL": "http://generator4",
						},
					},
					"num_firing":   2,
					"num_resolved": 2,
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &Notifier{
				conf: &config.PagerdutyConfig{
					Details: tt.args.details,
				},
				tmpl: test.CreateTmpl(t),
			}
			got, err := n.renderDetails(tt.args.data)
			if (err != nil) != tt.wantErr {
				t.Errorf("renderDetails() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			require.Equal(t, tt.want, got)
		})
	}
}

func TestPrepareContent(t *testing.T) {
	prepareContext := func() context.Context {
		ctx := context.Background()
		ctx = notify.WithGroupKey(ctx, "1")
		ctx = notify.WithReceiverName(ctx, "test-receiver")
		ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "HighCPU for Payment service"})
		return ctx
	}
	t.Run("default template uses go text template config for title", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		notifier, err := New(
			&config.PagerdutyConfig{
				RoutingKey:  config.Secret("01234567890123456789012345678901"),
				HTTPConfig:  &commoncfg.HTTPClientConfig{},
				Description: `{{ .CommonLabels.alertname }} ({{ .Status | toUpper }})`,
			},
			tmpl,
			promslog.NewNopLogger(),
			newTestTemplater(tmpl),
		)
		require.NoError(t, err)

		ctx := prepareContext()

		alerts := []*types.Alert{
			{
				Alert: model.Alert{
					Labels:   model.LabelSet{"alertname": "HighCPU for Payment service"},
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			},
		}

		title, err := notifier.prepareTitle(ctx, alerts)
		require.NoError(t, err)
		require.Equal(t, "HighCPU for Payment service (FIRING)", title)
	})

	t.Run("custom template uses $variable annotation for title", func(t *testing.T) {
		tmpl := test.CreateTmpl(t)
		notifier, err := New(
			&config.PagerdutyConfig{
				RoutingKey: config.Secret("01234567890123456789012345678901"),
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			},
			tmpl,
			promslog.NewNopLogger(),
			newTestTemplater(tmpl),
		)
		require.NoError(t, err)

		ctx := prepareContext()

		alerts := []*types.Alert{
			{
				Alert: model.Alert{
					Labels: model.LabelSet{
						"alertname": "HighCPU",
						"service":   "api-server",
					},
					Annotations: model.LabelSet{
						ruletypes.AnnotationTitleTemplate: "$rule.name on $service is in $alert.status state",
					},
					StartsAt: time.Now().Add(-time.Hour),
					EndsAt:   time.Now(),
				},
			},
		}

		title, err := notifier.prepareTitle(ctx, alerts)
		require.NoError(t, err)
		require.Equal(t, "HighCPU on api-server is in resolved state", title)
	})
}
