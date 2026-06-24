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

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
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

func TestJiraNotifierCreatesIssueWithGroupLabel(t *testing.T) {
	var (
		searchJQL      string
		issueCreated   bool
		createdPayload map[string]any
	)

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			var body issueSearch
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			searchJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/issue":
			if err := json.NewDecoder(r.Body).Decode(&createdPayload); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			issueCreated = true
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1","id":"12345"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	apiURL, err := url.Parse(mockServer.URL + "/rest/api/2/")
	if err != nil {
		t.Fatal(err)
	}

	cfg := &config.JiraConfig{
		APIURL:     &config.URL{URL: apiURL},
		APIType:    "datacenter",
		Project:    "TEST",
		IssueType:  "Incident",
		HTTPConfig: &commoncfg.HTTPClientConfig{},
		Summary: config.JiraFieldConfig{
			Template: "Alert: {{ .GroupLabels.alertname }}",
		},
		Description: config.JiraFieldConfig{
			Template: "{{ .CommonAnnotations.description }}",
		},
		Priority: "High",
		Labels:   []string{"signoz"},
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier, err := New(cfg, createTestTemplate(t, apiURL), logger)
	if err != nil {
		t.Fatalf("Failed to create notifier: %v", err)
	}

	alerts := []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"alertname": "TestAlert",
				},
				Annotations: model.LabelSet{
					"description": "Test Description",
				},
			},
		},
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-1")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	retry, err := notifier.Notify(ctx, alerts...)
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}
	if retry {
		t.Error("Expected retry=false on success")
	}
	if !issueCreated {
		t.Fatal("Expected issue to be created")
	}
	if !strings.Contains(searchJQL, `project="TEST"`) {
		t.Fatalf("expected project in JQL, got: %s", searchJQL)
	}
	if !strings.Contains(searchJQL, `labels="ALERT{`) {
		t.Fatalf("expected ALERT{group-hash} label in JQL, got: %s", searchJQL)
	}

	fields, ok := createdPayload["fields"].(map[string]any)
	if !ok {
		t.Fatalf("expected fields map in payload, got: %#v", createdPayload["fields"])
	}
	labels, ok := fields["labels"].([]any)
	if !ok || len(labels) < 2 {
		t.Fatalf("expected generated labels in issue payload, got: %#v", fields["labels"])
	}
}

func TestJiraNotifierResolvesExistingIssue(t *testing.T) {
	var transitioned bool

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"issues": []map[string]any{
					{
						"key": "TEST-1",
						"fields": map[string]any{
							"status": map[string]any{
								"name": "Open",
								"statusCategory": map[string]any{
									"key": "new",
								},
							},
						},
					},
				},
			})
		case r.Method == http.MethodGet && r.URL.Path == "/rest/api/2/issue/TEST-1/transitions":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"transitions": []map[string]string{
					{"id": "31", "name": "Done"},
				},
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
	defer mockServer.Close()

	apiURL, err := url.Parse(mockServer.URL + "/rest/api/2/")
	if err != nil {
		t.Fatal(err)
	}

	cfg := &config.JiraConfig{
		APIURL:            &config.URL{URL: apiURL},
		APIType:           "datacenter",
		Project:           "TEST",
		IssueType:         "Incident",
		ResolveTransition: "Done",
		HTTPConfig:        &commoncfg.HTTPClientConfig{},
		Summary: config.JiraFieldConfig{
			Template: "Alert: {{ .GroupLabels.alertname }}",
		},
		Description: config.JiraFieldConfig{
			Template: "{{ .CommonAnnotations.description }}",
		},
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier, err := New(cfg, createTestTemplate(t, apiURL), logger)
	if err != nil {
		t.Fatalf("Failed to create notifier: %v", err)
	}

	now := time.Now()
	alerts := []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"alertname": "TestAlert",
				},
				StartsAt: now.Add(-5 * time.Minute),
				EndsAt:   now,
			},
		},
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-resolved")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	retry, err := notifier.Notify(ctx, alerts...)
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}
	if retry {
		t.Error("Expected retry=false on success")
	}
	if !transitioned {
		t.Fatal("Expected existing issue to be transitioned to resolved state")
	}
}

func TestJiraNotifierMissingConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier := &Notifier{conf: nil, logger: logger}

	ctx := context.Background()
	_, err := notifier.Notify(ctx)
	if err == nil {
		t.Error("Expected error for nil config")
	}
}

func TestJiraNotifierSearchesAllIssuesWhenReopenDurationEmpty(t *testing.T) {
	var searchJQL string

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			var body issueSearch
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			searchJQL = body.JQL
			// Return a resolved issue that was resolved more than 7 days ago
			_ = json.NewEncoder(w).Encode(map[string]any{
				"issues": []map[string]any{
					{
						"key": "TEST-1",
						"fields": map[string]any{
							"status": map[string]any{
								"name": "Done",
								"statusCategory": map[string]any{
									"key": "done",
								},
							},
						},
					},
				},
			})
		case r.Method == http.MethodGet && r.URL.Path == "/rest/api/2/issue/TEST-1/transitions":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"transitions": []map[string]string{
					{"id": "3", "name": "Reopen"},
				},
			})
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/issue/TEST-1/transitions":
			w.WriteHeader(http.StatusNoContent)
		case r.Method == http.MethodPut && r.URL.Path == "/rest/api/2/issue/TEST-1":
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	apiURL, err := url.Parse(mockServer.URL + "/rest/api/2/")
	if err != nil {
		t.Fatal(err)
	}

	cfg := &config.JiraConfig{
		APIURL:           &config.URL{URL: apiURL},
		APIType:          "datacenter",
		Project:          "TEST",
		IssueType:        "Incident",
		ReopenTransition: "Reopen",
		ReopenDuration:   0, // Empty/zero duration should search all issues
		HTTPConfig:       &commoncfg.HTTPClientConfig{},
		Summary: config.JiraFieldConfig{
			Template: "Alert: {{ .GroupLabels.alertname }}",
		},
		Description: config.JiraFieldConfig{
			Template: "{{ .CommonAnnotations.description }}",
		},
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier, err := New(cfg, createTestTemplate(t, apiURL), logger)
	if err != nil {
		t.Fatalf("Failed to create notifier: %v", err)
	}

	alerts := []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"alertname": "TestAlert",
				},
				Annotations: model.LabelSet{
					"description": "Test Description",
				},
			},
		},
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-reopen-all")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	_, err = notifier.Notify(ctx, alerts...)
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}

	// When ReopenDuration is empty/zero, the JQL should NOT contain a resolutiondate filter in the WHERE clause
	// This allows searching ALL issues, including those resolved long ago (matching Grafana behavior)
	// Note: resolutiondate may still appear in ORDER BY clause, which is fine
	if strings.Contains(searchJQL, "resolutiondate is EMPTY") || strings.Contains(searchJQL, "resolutiondate >=") {
		t.Errorf("Expected no resolutiondate filter in WHERE clause when ReopenDuration is empty, got JQL: %s", searchJQL)
	}
	if !strings.Contains(searchJQL, `project="TEST"`) {
		t.Errorf("Expected project in JQL, got: %s", searchJQL)
	}
	if !strings.Contains(searchJQL, `labels="ALERT{`) {
		t.Errorf("Expected ALERT{group-hash} label in JQL, got: %s", searchJQL)
	}
}

func TestJiraNotifierSearchesWithinDurationWhenSet(t *testing.T) {
	var searchJQL string

	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/search":
			var body issueSearch
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			searchJQL = body.JQL
			_ = json.NewEncoder(w).Encode(issueSearchResult{Issues: []issue{}})
		case r.Method == http.MethodPost && r.URL.Path == "/rest/api/2/issue":
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1","id":"12345"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	apiURL, err := url.Parse(mockServer.URL + "/rest/api/2/")
	if err != nil {
		t.Fatal(err)
	}

	cfg := &config.JiraConfig{
		APIURL:           &config.URL{URL: apiURL},
		APIType:          "datacenter",
		Project:          "TEST",
		IssueType:        "Incident",
		ReopenTransition: "Reopen",
		ReopenDuration:   model.Duration(7 * 24 * time.Hour), // 7 days
		HTTPConfig:       &commoncfg.HTTPClientConfig{},
		Summary: config.JiraFieldConfig{
			Template: "Alert: {{ .GroupLabels.alertname }}",
		},
		Description: config.JiraFieldConfig{
			Template: "{{ .CommonAnnotations.description }}",
		},
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier, err := New(cfg, createTestTemplate(t, apiURL), logger)
	if err != nil {
		t.Fatalf("Failed to create notifier: %v", err)
	}

	alerts := []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"alertname": "TestAlert",
				},
			},
		},
	}

	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group-duration")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert"})

	_, err = notifier.Notify(ctx, alerts...)
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}

	// When ReopenDuration is set, the JQL should contain a resolutiondate filter
	if !strings.Contains(searchJQL, "resolutiondate") {
		t.Errorf("Expected resolutiondate filter when ReopenDuration is set, got JQL: %s", searchJQL)
	}
	// Should search for issues resolved within 7 days (10080 minutes)
	if !strings.Contains(searchJQL, "-10080m") {
		t.Errorf("Expected -10080m (7 days) in JQL, got: %s", searchJQL)
	}
}
