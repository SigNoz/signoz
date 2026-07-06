// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2023 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package jira

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
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func createTestTemplate(t *testing.T, externalURL *url.URL) *template.Template {
	t.Helper()
	tmpl, err := template.FromGlobs([]string{})
	if err != nil {
		t.Fatal(err)
	}
	tmpl.ExternalURL = externalURL
	return tmpl
}

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func newTestConfig(serverURL string) *config.JiraConfig {
	apiURL, _ := url.Parse(serverURL + "/rest/api/2/")
	return &config.JiraConfig{
		APIURL:     &config.URL{URL: apiURL},
		APIType:    "datacenter",
		Project:    "TEST",
		IssueType:  "Incident",
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		Summary:    config.JiraFieldConfig{Template: "Alert: {{ .GroupLabels.alertname }}"},
		Description: config.JiraFieldConfig{
			Template: "{{ .CommonAnnotations.description }}",
		},
	}
}

func TestNewRejectsNilConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := &template.Template{}
	_, err := New(nil, tmpl, logger, newTestTemplater(tmpl))
	require.Error(t, err)
}

func TestJiraRetry(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	for _, tc := range []struct {
		statusCode  int
		expectRetry bool
	}{
		{http.StatusOK, false},
		{http.StatusBadRequest, false},
		{http.StatusUnauthorized, false},
		{http.StatusForbidden, false},
		{http.StatusNotFound, false},
		{http.StatusTooManyRequests, true},
		{http.StatusInternalServerError, true}, // Retrier retries all 5xx by default
		{http.StatusBadGateway, true},
	} {
		actual, _ := notifier.retrier.Check(tc.statusCode, nil)
		require.Equal(t, tc.expectRetry, actual, "unexpected retry for status %d", tc.statusCode)
	}
}

func TestPrepareSearchRequest(t *testing.T) {
	for _, tc := range []struct {
		title       string
		apiType     string
		host        string
		expectedURL string
	}{
		{
			title:       "cloud always uses v3 search/jql",
			apiType:     "cloud",
			host:        "example.atlassian.net",
			expectedURL: "/rest/api/3/search/jql",
		},
		{
			title:       "auto with atlassian.net uses v3 search/jql",
			apiType:     "auto",
			host:        "example.atlassian.net",
			expectedURL: "/rest/api/3/search/jql",
		},
		{
			title:       "auto without atlassian.net uses v2 search",
			apiType:     "auto",
			host:        "jira.internal.com",
			expectedURL: "/rest/api/2/search",
		},
		{
			title:       "datacenter always uses v2 search",
			apiType:     "datacenter",
			host:        "example.atlassian.net",
			expectedURL: "/rest/api/2/search",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			apiURL := &url.URL{Scheme: "https", Host: tc.host, Path: "/rest/api/2"}
			cfg := &config.JiraConfig{
				APIURL:     &config.URL{URL: apiURL},
				APIType:    tc.apiType,
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				Summary:    config.JiraFieldConfig{Template: "s"},
				Description: config.JiraFieldConfig{Template: "d"},
			}
			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			tmpl := &template.Template{}
			notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
			require.NoError(t, err)

			_, searchURL := notifier.prepareSearchRequest("project=TEST")
			parsedURL, err := url.Parse(searchURL)
			require.NoError(t, err)
			require.Equal(t, tc.expectedURL, parsedURL.Path)

			// Original conf APIURL must not be mutated
			require.Equal(t, "/rest/api/2", cfg.APIURL.Path)
		})
	}
}

func TestWontFixResolutionJQL(t *testing.T) {
	var capturedJQL string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/search") {
			var body issueSearch
			_ = json.NewDecoder(r.Body).Decode(&body)
			capturedJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
			return
		}
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/issue") {
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1"}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	cfg.WontFixResolution = "Won't Do"

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "g1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "test"})

	_, err = notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "test"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
		},
	})
	require.NoError(t, err)

	// Must use (resolution is EMPTY or resolution != X) so unresolved open issues
	// are not silently excluded by JQL's != operator.
	require.Contains(t, capturedJQL, `(resolution is EMPTY or resolution != "Won't Do")`)
	require.NotContains(t, capturedJQL, `resolution != "Won't Do" and`)
}

func TestSummarySuppressionOnUpdate(t *testing.T) {
	var updatedFields map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/search"):
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{
				{
					Key: "TEST-1",
					Fields: &issueFields{
						Status: &issueStatus{
							StatusCategory: struct {
								Key string `json:"key"`
							}{Key: "new"},
						},
					},
				},
			}})
		case r.Method == http.MethodPut && r.URL.Path == "/rest/api/2/issue/TEST-1":
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			if f, ok := body["fields"].(map[string]any); ok {
				updatedFields = f
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	falseVal := false
	cfg := newTestConfig(srv.URL)
	cfg.Summary = config.JiraFieldConfig{
		Template:     "Alert: {{ .GroupLabels.alertname }}",
		EnableUpdate: &falseVal,
	}
	cfg.Description = config.JiraFieldConfig{
		Template:     "some description",
		EnableUpdate: &falseVal,
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "g1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "test"})

	_, err = notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "test"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
		},
	})
	require.NoError(t, err)
	require.NotNil(t, updatedFields, "expected PUT request to issue")

	_, hasSummary := updatedFields["summary"]
	_, hasDescription := updatedFields["description"]
	require.False(t, hasSummary, "summary should be absent from update when EnableUpdate=false")
	require.False(t, hasDescription, "description should be absent from update when EnableUpdate=false")
}

func TestJiraNotifierCreatesIssueWithGroupLabel(t *testing.T) {
	var (
		searchJQL      string
		issueCreated   bool
		createdPayload map[string]any
	)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			var body issueSearch
			_ = json.NewDecoder(r.Body).Decode(&body)
			searchJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/issue":
			_ = json.NewDecoder(r.Body).Decode(&createdPayload)
			issueCreated = true
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1","id":"12345"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	cfg.Priority = "High"
	cfg.Labels = []string{"signoz"}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "test-group-1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	retry, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:      model.LabelSet{"alertname": "TestAlert"},
			Annotations: model.LabelSet{"description": "Test Description"},
		},
	})
	require.NoError(t, err)
	require.False(t, retry)
	require.True(t, issueCreated)
	require.Contains(t, searchJQL, `project="TEST"`)
	require.Contains(t, searchJQL, `labels="ALERT{`)

	fields, ok := createdPayload["fields"].(map[string]any)
	require.True(t, ok)
	labels, ok := fields["labels"].([]any)
	require.True(t, ok)
	require.GreaterOrEqual(t, len(labels), 2)
}

func TestJiraNotifierResolvesExistingIssue(t *testing.T) {
	var transitioned bool

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"issues": []map[string]any{{
					"key": "TEST-1",
					"fields": map[string]any{
						"status": map[string]any{
							"name":           "Open",
							"statusCategory": map[string]any{"key": "new"},
						},
					},
				}},
			})
		case r.Method == http.MethodGet && r.URL.Path == "/rest/api/2/issue/TEST-1/transitions":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"transitions": []map[string]string{{"id": "31", "name": "Done"}},
			})
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/issue/TEST-1/transitions":
			transitioned = true
			w.WriteHeader(http.StatusNoContent)
		case r.Method == http.MethodPut && r.URL.Path == "/rest/api/2/issue/TEST-1":
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	cfg.ResolveTransition = "Done"

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	now := time.Now()
	ctx := notify.WithGroupKey(context.Background(), "test-group-resolved")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	retry, err := notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "TestAlert"},
			StartsAt: now.Add(-5 * time.Minute),
			EndsAt:   now,
		},
	})
	require.NoError(t, err)
	require.False(t, retry)
	require.True(t, transitioned)
}

func TestReopenDurationZeroUsesStatusFilter(t *testing.T) {
	var capturedJQL string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/search"):
			var body issueSearch
			_ = json.NewDecoder(r.Body).Decode(&body)
			capturedJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/issue"):
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	cfg.ReopenTransition = "Reopen"
	cfg.ReopenDuration = 0

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "g1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "test"})

	_, err = notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "test"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
		},
	})
	require.NoError(t, err)

	// ReopenTransition set but ReopenDuration=0: falls back to statusCategory != Done,
	// no resolutiondate filter.
	require.Contains(t, capturedJQL, "statusCategory != Done")
	require.NotContains(t, capturedJQL, "resolutiondate is EMPTY")
	require.NotContains(t, capturedJQL, "resolutiondate >=")
}

func TestReopenDurationSetUsesResolutiondateFilter(t *testing.T) {
	var capturedJQL string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/search"):
			var body issueSearch
			_ = json.NewDecoder(r.Body).Decode(&body)
			capturedJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/issue"):
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	cfg := newTestConfig(srv.URL)
	cfg.ReopenTransition = "Reopen"
	cfg.ReopenDuration = model.Duration(7 * 24 * time.Hour)

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	tmpl := createTestTemplate(t, cfg.APIURL.URL)
	notifier, err := New(cfg, tmpl, logger, newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "g1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "test"})

	_, err = notifier.Notify(ctx, &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "test"},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
		},
	})
	require.NoError(t, err)
	require.Contains(t, capturedJQL, "resolutiondate is EMPTY OR resolutiondate >= -10080m")
}
