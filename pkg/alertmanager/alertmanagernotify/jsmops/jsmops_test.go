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

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	signoztypes "github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

// fakeResolver is a test double for ConnectionResolver.
type fakeResolver struct {
	accessToken  string
	refreshToken string
	cloudID      string
	// refreshed tracks whether Refresh was called and what it returned.
	refreshCalled bool
	newAccess     string
	newRefresh    string
}

func (f *fakeResolver) Resolve(_ context.Context, orgID, _ string) (*alertmanagertypes.AtlassianConnection, error) {
	return &alertmanagertypes.AtlassianConnection{
		Identifiable: signoztypes.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        orgID,
		CloudID:      f.cloudID,
		AccessToken:  f.accessToken,
		RefreshToken: f.refreshToken,
	}, nil
}

func (f *fakeResolver) Refresh(_ context.Context, orgID, _ string) (*alertmanagertypes.AtlassianConnection, error) {
	f.refreshCalled = true
	return &alertmanagertypes.AtlassianConnection{
		Identifiable: signoztypes.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        orgID,
		CloudID:      f.cloudID,
		AccessToken:  f.newAccess,
		RefreshToken: f.newRefresh,
	}, nil
}

func TestJsmOpsCreateAlert(t *testing.T) {
	var payload bytes.Buffer
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "Bearer test-access-token", r.Header.Get("Authorization"))
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts"):
			_, _ = io.Copy(&payload, r.Body)
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{}`))
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alias"):
			// First fire: the async create is not indexed yet, so the alias does not resolve and no field update is attempted.
			w.WriteHeader(http.StatusNotFound)
		default:
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	resolver := &fakeResolver{accessToken: "test-access-token", refreshToken: "rt", cloudID: "cloud"}
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		ConnectionID: "conn-1",
		OrgID:        "org-1",
		Responders:   []string{"team-1"},
		Message:      "Alert: {{ .CommonLabels.alertname }}",
		Description:  "Body: {{ .CommonLabels.alertname }}",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), resolver)
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

func TestJsmOpsRefreshesExpiredToken(t *testing.T) {
	var createAttempts int
	var lastAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// First fire: alias does not resolve yet, so no field update happens.
		if r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/alerts/alias") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		lastAuth = r.Header.Get("Authorization")
		createAttempts++
		// First call presents the stale token and gets a 401; after refresh the retry presents the new token and succeeds.
		if lastAuth == "Bearer stale-access-token" {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"unauthorized"}`))
			return
		}
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	resolver := &fakeResolver{
		accessToken:  "stale-access-token",
		refreshToken: "stale-refresh-token",
		cloudID:      "cloud",
		newAccess:    "new-access-token",
		newRefresh:   "new-refresh-token",
	}
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		ConnectionID: "conn-1",
		OrgID:        "org-1",
		Responders:   []string{"team-1"},
		Message:      "Alert: {{ .CommonLabels.alertname }}",
		Description:  "Body",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), resolver)
	require.NoError(t, err)
	notifier.baseURL = server.URL

	ctx := notify.WithGroupKey(context.Background(), "group")
	ok, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "High CPU"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		},
	})
	require.NoError(t, err)
	require.False(t, ok)

	require.True(t, resolver.refreshCalled)
	require.Equal(t, 2, createAttempts)
	require.Equal(t, "Bearer new-access-token", lastAuth)
}

func TestJsmOpsUpdatesExistingAlert(t *testing.T) {
	var messageBody, descriptionBody bytes.Buffer
	var messageUpdated, descriptionUpdated bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts"):
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{}`))
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alias"):
			// The create is indexed, so the alias resolves and field updates follow.
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"id":"alert-1"}`))
		case r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alert-1/message"):
			_, _ = io.Copy(&messageBody, r.Body)
			messageUpdated = true
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{}`))
		case r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alert-1/description"):
			_, _ = io.Copy(&descriptionBody, r.Body)
			descriptionUpdated = true
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{}`))
		default:
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	resolver := &fakeResolver{accessToken: "test-access-token", refreshToken: "rt", cloudID: "cloud"}
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		ConnectionID: "conn-1",
		OrgID:        "org-1",
		Responders:   []string{"team-1"},
		Message:      "Alert: {{ .CommonLabels.alertname }}",
		Description:  "Body: {{ .CommonLabels.alertname }}",
		UpdateAlerts: true,
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), resolver)
	require.NoError(t, err)
	notifier.baseURL = server.URL

	ctx := notify.WithGroupKey(context.Background(), "group")
	ok, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "High CPU"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		},
	})
	require.NoError(t, err)
	require.False(t, ok)

	require.True(t, messageUpdated)
	require.True(t, descriptionUpdated)
	require.JSONEq(t, `{"message":"Alert: High CPU"}`, messageBody.String())
	require.JSONEq(t, `{"description":"Body: High CPU"}`, descriptionBody.String())
}

func TestJsmOpsUpdateDisabledByDefault(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts"):
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{}`))
		default:
			// With UpdateAlerts off, no alias lookup or field update should ever be attempted.
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	resolver := &fakeResolver{accessToken: "test-access-token", refreshToken: "rt", cloudID: "cloud"}
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		ConnectionID: "conn-1",
		OrgID:        "org-1",
		Responders:   []string{"team-1"},
		Message:      "Alert: {{ .CommonLabels.alertname }}",
		Description:  "Body",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), resolver)
	require.NoError(t, err)
	notifier.baseURL = server.URL

	ctx := notify.WithGroupKey(context.Background(), "group")
	ok, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "High CPU"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Minute),
		},
	})
	require.NoError(t, err)
	require.False(t, ok)
}

func TestJsmOpsCloseAlert(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alias"):
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"id":"alert-1"}`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/cloud/jsm/ops/api/v1/alerts/alert-1/close"):
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	resolver := &fakeResolver{accessToken: "test-access-token", refreshToken: "rt", cloudID: "cloud"}
	tmpl := test.CreateTmpl(t)
	notifier, err := New(&alertmanagertypes.JsmOpsReceiverConfig{
		NotifierConfig: config.NotifierConfig{VSendResolved: true},
		ConnectionID:   "conn-1",
		OrgID:          "org-1",
		Message:        "Alert: {{ .CommonLabels.alertname }}",
		Description:    "Body",
	}, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), resolver)
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
