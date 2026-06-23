// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package googlechat

import (
	"bytes"
	"context"
	"crypto/tls"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
	"unicode/utf8"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	notifytest "github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
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
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	for statusCode, expected := range notifytest.RetryTests(notifytest.DefaultRetryCodes()) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "retry - error on status %d", statusCode)
	}
}

func TestGoogleChatNewDoesNotValidateURL(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	_, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "http://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	tmpl2 := test.CreateTmpl(t)
	_, err = New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "https://example.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       "Test message",
	}, tmpl2, slog.New(slog.DiscardHandler), newTestTemplater(tmpl2))
	require.NoError(t, err)
}

func TestGoogleChatRedactedURL(t *testing.T) {
	secret := "secret-token"
	urlStr := "https://chat.googleapis.com/v1/spaces/test/messages?token=" + secret

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, urlStr),
		Title:      "Alert",
		Text:       "Test message",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	notifier.client = &http.Client{Transport: roundTripperFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "request failed")
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

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, webhookURL),
		Title:      title,
		Text:       text,
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
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

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func TestSanitizeUTF8(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "valid UTF-8 string",
			input:    "Hello, 世界! 🎉",
			expected: "Hello, 世界! 🎉",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "ASCII only",
			input:    "Hello World",
			expected: "Hello World",
		},
		{
			name:     "invalid UTF-8 bytes",
			input:    "Hello\xff\xfeWorld",
			expected: "Hello\ufffd\ufffdWorld", // U+FFFD is the replacement character
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeUTF8(tt.input)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestTruncateToByteLimit(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		maxBytes   int
		wantLen    int
		wantSuffix string
	}{
		{
			name:       "string shorter than limit",
			input:      "Hello World",
			maxBytes:   100,
			wantLen:    11,
			wantSuffix: "",
		},
		{
			name:       "string exactly at limit",
			input:      "Hello",
			maxBytes:   5,
			wantLen:    5,
			wantSuffix: "",
		},
		{
			name:       "string longer than limit - ASCII",
			input:      "Hello World, this is a long message",
			maxBytes:   20,
			wantLen:    20,
			wantSuffix: "...",
		},
		{
			name:       "string with multibyte UTF-8 characters",
			input:      "Hello 世界! This is a test message with unicode characters",
			maxBytes:   30,
			wantLen:    30,
			wantSuffix: "...",
		},
		{
			name:       "very small limit",
			input:      "Hello World",
			maxBytes:   5,
			wantLen:    5,
			wantSuffix: "...",
		},
		{
			name:       "limit smaller than ellipsis",
			input:      "Hello World",
			maxBytes:   2,
			wantLen:    2,
			wantSuffix: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := truncateToByteLimit(tt.input, tt.maxBytes)

			// Check byte length
			require.LessOrEqual(t, len(result), tt.maxBytes, "result exceeds max bytes")
			require.Equal(t, tt.wantLen, len(result), "unexpected byte length")

			// Check for ellipsis if truncated
			if len(tt.input) > tt.maxBytes && tt.wantSuffix != "" {
				require.True(t, len(result) >= 3, "truncated result too short for ellipsis")
				require.Equal(t, "...", result[len(result)-3:], "truncated result should end with ellipsis")
			}

			// Ensure result is valid UTF-8
			require.True(t, utf8.ValidString(result), "result contains invalid UTF-8")
		})
	}
}

func TestGoogleChatMessageSizeLimit(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		_, _ = io.Copy(&payload, r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	// Create a very large message that exceeds the limit
	largeBody := make([]byte, maxMessageBytes+1000)
	for i := range largeBody {
		largeBody[i] = 'A'
	}

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       string(largeBody),
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)
	notifier.client = newTestHTTPClient(server)

	retry, err := notifier.Notify(newTestContext(), newTestAlerts("TestAlert")...)
	require.NoError(t, err)
	require.False(t, retry)

	// The ENTIRE JSON payload should be under the limit
	require.LessOrEqual(t, payload.Len(), maxMessageBytes,
		"entire JSON payload must be <= maxMessageBytes (got %d bytes)", payload.Len())

	// Verify the payload contains truncation indicator
	require.Contains(t, payload.String(), "...", "truncated message should contain ellipsis")
}

func TestGoogleChatInvalidUTF8(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		_, _ = io.Copy(&payload, r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	// Create a message with invalid UTF-8
	invalidUTF8 := "Hello \xff\xfe World"

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.GoogleChatReceiverConfig{
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		WebhookURL: secretURLFromString(t, "https://chat.googleapis.com/v1/spaces/test/messages"),
		Title:      "Alert",
		Text:       invalidUTF8,
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)
	notifier.client = newTestHTTPClient(server)

	retry, err := notifier.Notify(newTestContext(), newTestAlerts("TestAlert")...)
	require.NoError(t, err)
	require.False(t, retry)

	// The payload should contain valid UTF-8
	require.True(t, utf8.ValidString(payload.String()), "payload should contain valid UTF-8")
}
