// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func TestJsmOpsCreateAlert(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		require.True(t, ok)
		require.Equal(t, "ops@example.com", user)
		require.Equal(t, "token", pass)
		require.Equal(t, http.MethodPost, r.Method)
		require.True(t, strings.HasSuffix(r.URL.Path, "/cloud/v1/alerts"))
		_, _ = io.Copy(&payload, r.Body)
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		Email:       "ops@example.com",
		APIToken:    "token",
		CloudID:     "cloud",
		Responders:  []string{"team-1"},
		Message:     "Alert: {{ .CommonLabels.alertname }}",
		Description: "Body: {{ .CommonLabels.alertname }}",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)
	notifier.baseURL = server.URL

	ctx := notify.WithGroupKey(context.Background(), "group")
	ok, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname": "High CPU",
			},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		},
	})
	require.NoError(t, err)
	require.False(t, ok)

	var body createAlertRequest
	require.NoError(t, json.Unmarshal(payload.Bytes(), &body))
	require.Equal(t, "Alert: High CPU", body.Message)
	require.Equal(t, "Body: High CPU", body.Description)
	require.Equal(t, "team", body.Responders[0].Type)
	require.Equal(t, "team-1", body.Responders[0].ID)
}

func TestJsmOpsCloseAlert(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/cloud/v1/alerts/alias"):
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"id":"alert-1"}`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/cloud/v1/alerts/alert-1/close"):
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		Email:             "ops@example.com",
		APIToken:          "token",
		CloudID:           "cloud",
		Message:           "Alert: {{ .CommonLabels.alertname }}",
		Description:       "Body",
		SendResolvedValue: true,
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)
	notifier.baseURL = server.URL

	ctx := notify.WithGroupKey(context.Background(), "group")
	ok, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"alertname": "High CPU",
			},
			StartsAt: time.Now().Add(-time.Hour),
			EndsAt:   time.Now().Add(-time.Minute),
		},
	})
	require.NoError(t, err)
	require.False(t, ok)
}
