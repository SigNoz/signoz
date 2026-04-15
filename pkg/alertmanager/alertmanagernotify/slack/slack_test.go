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

func TestSlackRetry(t *testing.T) {
	notifier, err := New(
		&config.SlackConfig{
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		promslog.NewNopLogger(),
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

	notifier, err := New(
		&config.SlackConfig{
			APIURL:     &config.SecretURL{URL: u},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		promslog.NewNopLogger(),
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

	notifier, err := New(
		&config.SlackConfig{
			APIURLFile: f.Name(),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		promslog.NewNopLogger(),
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

	notifier, err := New(
		&config.SlackConfig{
			APIURLFile: f.Name(),
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		promslog.NewNopLogger(),
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
			notifier, err := New(
				&config.SlackConfig{
					NotifierConfig: config.NotifierConfig{},
					HTTPConfig:     &commoncfg.HTTPClientConfig{},
					APIURL:         &config.SecretURL{URL: apiurl},
					Channel:        "channelname",
				},
				test.CreateTmpl(t),
				promslog.NewNopLogger(),
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
			notifier, err := New(
				&config.SlackConfig{
					NotifierConfig: config.NotifierConfig{},
					HTTPConfig:     &commoncfg.HTTPClientConfig{},
					APIURL:         &config.SecretURL{URL: u},
					Channel:        "channelname",
					Timeout:        tt.timeout,
				},
				test.CreateTmpl(t),
				promslog.NewNopLogger(),
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
	notifier, err := New(conf, tmpl, logger)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-key")

	if _, err := notifier.Notify(ctx); err != nil {
		t.Fatal("Notify failed:", err)
	}
}
