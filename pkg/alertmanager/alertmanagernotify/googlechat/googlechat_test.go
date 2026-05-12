// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package googlechat

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	notifytest "github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func TestGoogleChatWebhook(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		_, _ = io.Copy(&payload, r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	notifier := newTestNotifier(t, server, "Alert: {{ .GroupLabels.alertname }}", "{{ range .Alerts -}} Alert: {{ .Labels.alertname }} {{ end }}")
	retry, err := notifier.Notify(newTestContext(), newTestAlerts("TestAlert")...)
	require.NoError(t, err)
	require.False(t, retry)
	require.Contains(t, payload.String(), `"text"`)
	require.Contains(t, payload.String(), "Alert: TestAlert")
}

func TestGoogleChatTemplating(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		_, _ = io.Copy(&payload, r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	notifier := newTestNotifier(t, server, "Alert: {{ .GroupLabels.alertname }}", "Summary: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}")
	retry, err := notifier.Notify(newTestContext(), newTestAlerts("CPU High")...)
	require.NoError(t, err)
	require.False(t, retry)
	require.Contains(t, payload.String(), "CPU High")
	require.Contains(t, payload.String(), "Summary:")
}

func TestGoogleChatRetry(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	notifier := newTestNotifier(t, server, "Alert", "Test message")
	retry, err := notifier.Notify(newTestContext(), newTestAlerts("TestAlert")...)
	require.Error(t, err)
	require.True(t, retry)
}

func TestGoogleChatRetryCodes(t *testing.T) {
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, test.CreateTmpl(t), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)

	for statusCode, expected := range notifytest.RetryTests(notifytest.DefaultRetryCodes()) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "retry - error on status %d", statusCode)
	}
}

func TestGoogleChatWebhookValidation(t *testing.T) {
	_, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		WebhookURL: secretURLFromString(t, "http://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, test.CreateTmpl(t), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.Error(t, err)
	require.Contains(t, err.Error(), "webhook_url must use https")

	_, err = New(&alertmanagertypes.GoogleChatReceiverConfig{
		WebhookURL: secretURLFromString(t, "https://example.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, test.CreateTmpl(t), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.Error(t, err)
	require.Contains(t, err.Error(), "webhook_url must use chat.googleapis.com")
}

func TestGoogleChatRedactedURL(t *testing.T) {
	secret := "secret-token"
	urlStr := "https://chat.googleapis.com/v1/spaces/test/messages?token=" + secret

	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		WebhookURL: secretURLFromString(t, urlStr),
		Title:      "Alert",
		Text:       "Test message",
	}, test.CreateTmpl(t), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)

	notifier.client = &http.Client{Transport: roundTripperFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("request failed")
	})}

	_, err = notifier.Notify(newTestContext(), newTestAlerts("TestAlert")...)
	require.Error(t, err)
	require.NotContains(t, err.Error(), secret)
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (fn roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func newTestNotifier(t *testing.T, server *httptest.Server, title, text string) *Notifier {
	t.Helper()

	webhookURL := "https://chat.googleapis.com/v1/spaces/test/messages"

	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		WebhookURL: secretURLFromString(t, webhookURL),
		Title:      title,
		Text:       text,
	}, test.CreateTmpl(t), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	notifier.client = newTestHTTPClient(server)

	return notifier
}

func newTestHTTPClient(server *httptest.Server) *http.Client {
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialer.DialContext(ctx, network, server.Listener.Addr().String())
		},
	}

	return &http.Client{Transport: transport}
}

func secretURLFromString(t *testing.T, rawURL string) *config.SecretURL {
	t.Helper()

	parsed, err := url.Parse(rawURL)
	require.NoError(t, err)

	return &config.SecretURL{URL: parsed}
}

func newTestAlerts(alertname string) []*types.Alert {
	return []*types.Alert{{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname": model.LabelValue(alertname),
			},
			Annotations: model.LabelSet{
				"summary": model.LabelValue("summary for " + alertname),
			},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		},
	}}
}

func newTestContext() context.Context {
	return notify.WithGroupKey(context.Background(), "test-receiver")
}
