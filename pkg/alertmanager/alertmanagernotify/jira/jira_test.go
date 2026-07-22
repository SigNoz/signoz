// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2023 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
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
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func createTestTemplate(t *testing.T) *template.Template {
	t.Helper()
	tmpl, err := template.FromGlobs([]string{})
	require.NoError(t, err)
	u, _ := url.Parse("http://signoz.example.com")
	tmpl.ExternalURL = u
	return tmpl
}

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func newTestConfig() *alertmanagertypes.JiraReceiverConfig {
	return &alertmanagertypes.JiraReceiverConfig{
		JiraConfig: config.JiraConfig{
			Project:     "TEST",
			IssueType:   "Incident",
			Summary:     config.JiraFieldConfig{Template: "Alert: {{ .GroupLabels.alertname }}"},
			Description: config.JiraFieldConfig{Template: "{{ .CommonAnnotations.description }}"},
		},
		ConnectionID: "conn-1",
		OrgID:        "org-1",
	}
}

// fakeResolver is a test double for ConnectionResolver.
type fakeResolver struct {
	access, refresh, cloud string
	refreshCalled          bool
	newAccess, newRefresh  string
}

func (f *fakeResolver) connection() *alertmanagertypes.AtlassianConnection {
	return alertmanagertypes.NewAtlassianConnection("org-1", f.cloud, "https://acme.atlassian.net", f.access, f.refresh)
}

func (f *fakeResolver) Resolve(_ context.Context, _, _ string) (*alertmanagertypes.AtlassianConnection, error) {
	return f.connection(), nil
}

func (f *fakeResolver) Refresh(_ context.Context, _, _ string) (*alertmanagertypes.AtlassianConnection, error) {
	f.refreshCalled = true
	conn := f.connection()
	conn.AccessToken = f.newAccess
	conn.RefreshToken = f.newRefresh
	return conn, nil
}

func newTestNotifier(t *testing.T, resolver ConnectionResolver, baseURL string) *Notifier {
	t.Helper()
	tmpl := createTestTemplate(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	n, err := New(newTestConfig(), tmpl, logger, newTestTemplater(tmpl), resolver)
	require.NoError(t, err)
	n.cloudGateway = baseURL
	return n
}

func firingAlert() *types.Alert {
	return &types.Alert{Alert: model.Alert{
		Labels:      model.LabelSet{"alertname": "HighCPU"},
		Annotations: model.LabelSet{"description": "cpu is high"},
		StartsAt:    time.Now(),
		EndsAt:      time.Now().Add(time.Hour),
	}}
}

func boolPtr(v bool) *bool { return &v }

// alertLabelFor mirrors how Notify derives the per-group Jira label from the
// group key: ALERT{sha256(groupKey)}.
func alertLabelFor(groupKey string) string {
	sum := sha256.Sum256([]byte(groupKey))
	return fmt.Sprintf("ALERT{%x}", sum)
}

// newNotifierWithConfig builds a Notifier for the given config, pointed at a test
// server, with a resolver that hands out a static "cloud" cloudid.
func newNotifierWithConfig(t *testing.T, cfg *config.JiraConfig, baseURL string) *Notifier {
	t.Helper()
	tmpl := createTestTemplate(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	resolver := &fakeResolver{access: "tok", refresh: "rt", cloud: "cloud"}
	receiverCfg := newTestConfig()
	receiverCfg.JiraConfig = *cfg
	n, err := New(receiverCfg, tmpl, logger, newTestTemplater(tmpl), resolver)
	require.NoError(t, err)
	n.cloudGateway = baseURL
	return n
}

func alertWith(labels model.LabelSet, resolved bool) *types.Alert {
	a := &types.Alert{Alert: model.Alert{Labels: labels}}
	if resolved {
		a.StartsAt = time.Now().Add(-time.Hour)
		a.EndsAt = time.Now().Add(-time.Hour)
	} else {
		a.StartsAt = time.Now()
		a.EndsAt = time.Now().Add(time.Hour)
	}
	return a
}

func TestNewRejectsNilConfig(t *testing.T) {
	tmpl := createTestTemplate(t)
	_, err := New(nil, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), &fakeResolver{})
	require.Error(t, err)
}

func TestNewRequiresResolverOrgAndConnection(t *testing.T) {
	tmpl := createTestTemplate(t)
	_, err := New(newTestConfig(), tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), nil)
	require.Error(t, err)

	missingOrg := newTestConfig()
	missingOrg.OrgID = ""
	_, err = New(missingOrg, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), &fakeResolver{})
	require.Error(t, err)

	missingConnection := newTestConfig()
	missingConnection.ConnectionID = ""
	_, err = New(missingConnection, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl), &fakeResolver{})
	require.Error(t, err)
}

func TestJiraCreatesIssueOverOAuth(t *testing.T) {
	var createBody []byte
	var authHeader string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/cloud/rest/api/3/search/jql"):
			_, _ = w.Write([]byte(`{"issues":[]}`))
		case strings.HasSuffix(r.URL.Path, "/cloud/rest/api/3/issue"):
			authHeader = r.Header.Get("Authorization")
			createBody, _ = io.ReadAll(r.Body)
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"key":"TEST-1"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	n := newTestNotifier(t, &fakeResolver{access: "tok", refresh: "rt", cloud: "cloud"}, srv.URL)
	ctx := notify.WithGroupKey(context.Background(), "group")

	shouldRetry, err := n.Notify(ctx, firingAlert())
	require.NoError(t, err)
	require.False(t, shouldRetry)
	require.Equal(t, "Bearer tok", authHeader)

	var payload issue
	require.NoError(t, json.Unmarshal(createBody, &payload))
	require.NotNil(t, payload.Fields)
	require.Equal(t, "TEST", payload.Fields.Project.Key)
	require.Equal(t, "Incident", payload.Fields.Issuetype.Name)
	// Cloud description must be Atlassian Document Format.
	_, isADF := payload.Fields.Description.(map[string]any)
	require.True(t, isADF)
}

func TestJiraRefreshesExpiredToken(t *testing.T) {
	var lastAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/search/jql") {
			lastAuth = r.Header.Get("Authorization")
			if lastAuth == "Bearer stale" {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"message":"unauthorized"}`))
				return
			}
			_, _ = w.Write([]byte(`{"issues":[]}`))
			return
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"key":"TEST-1"}`))
	}))
	defer srv.Close()

	resolver := &fakeResolver{access: "stale", refresh: "stale-rt", cloud: "cloud", newAccess: "fresh", newRefresh: "fresh-rt"}
	n := newTestNotifier(t, resolver, srv.URL)
	ctx := notify.WithGroupKey(context.Background(), "group")

	shouldRetry, err := n.Notify(ctx, firingAlert())
	require.NoError(t, err)
	require.False(t, shouldRetry)
	require.True(t, resolver.refreshCalled)
	require.Equal(t, "Bearer fresh", lastAuth)
}

func TestJiraRetryOnTooManyRequests(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/search/jql") {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer srv.Close()

	n := newTestNotifier(t, &fakeResolver{access: "tok", refresh: "rt", cloud: "cloud"}, srv.URL)
	ctx := notify.WithGroupKey(context.Background(), "group")

	shouldRetry, err := n.Notify(ctx, firingAlert())
	require.Error(t, err)
	require.True(t, shouldRetry)
}

// TestJiraNotifyLifecycle exercises the create / update / reopen / resolve flows
// of Notify against a fake Jira Cloud, adapted from the upstream TestJiraNotify.
// Descriptions are asserted as Atlassian Document Format since OAuth 3LO always
// targets Jira Cloud.
func TestJiraNotifyLifecycle(t *testing.T) {
	baseCfg := func() *config.JiraConfig {
		return &config.JiraConfig{
			Summary:           config.JiraFieldConfig{Template: `{{ template "jira.default.summary" . }}`},
			Description:       config.JiraFieldConfig{Template: `{{ template "jira.default.description" . }}`},
			IssueType:         "Incident",
			Project:           "OPS",
			Priority:          `{{ template "jira.default.priority" . }}`,
			Labels:            []string{"alertmanager", "{{ .GroupLabels.alertname }}"},
			ReopenDuration:    model.Duration(1 * time.Hour),
			ReopenTransition:  "REOPEN",
			ResolveTransition: "CLOSE",
			WontFixResolution: "WONTFIX",
		}
	}

	for _, tc := range []struct {
		title string
		cfg   *config.JiraConfig
		alert *types.Alert

		search         issueSearchResult
		transitionsGet []idNameValue // returned by GET .../transitions for the existing issue

		expectMethod     string // POST for create, PUT for update
		expectPathSuffix string // e.g. "/issue" or "/issue/OPS-1"
		assertBody       func(t *testing.T, fields map[string]any)
		expectTransID    string // transition id expected to be applied ("" = none)
		errSubstr        string
	}{
		{
			title: "create new issue",
			cfg:   baseCfg(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1", "severity": "critical"}, false),
			search: issueSearchResult{
				Issues: []issue{},
			},
			expectMethod:     http.MethodPost,
			expectPathSuffix: "/issue",
			assertBody: func(t *testing.T, fields map[string]any) {
				require.Equal(t, "OPS", asMap(fields["project"])["key"])
				require.Equal(t, "Incident", asMap(fields["issuetype"])["name"])
				require.Equal(t, "High", asMap(fields["priority"])["name"])
				require.Equal(t,
					[]string{alertLabelFor("1"), "alertmanager", "test"},
					toStringSlice(fields["labels"]))
				// Summary present and non-empty.
				require.NotEmpty(t, fields["summary"])
				// Cloud description must be Atlassian Document Format.
				require.Equal(t, "doc", asMap(fields["description"])["type"])
			},
		},
		{
			title: "update existing issue with disabled summary and description",
			cfg: func() *config.JiraConfig {
				c := baseCfg()
				c.Summary.EnableUpdate = boolPtr(false)
				c.Description.EnableUpdate = boolPtr(false)
				return c
			}(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1", "severity": "critical"}, false),
			search: issueSearchResult{
				Issues: []issue{
					{Key: "OPS-1", Fields: statusFields("Open", "open")},
				},
			},
			expectMethod:     http.MethodPut,
			expectPathSuffix: "/issue/OPS-1",
			assertBody: func(t *testing.T, fields map[string]any) {
				_, hasSummary := fields["summary"]
				_, hasDescription := fields["description"]
				require.False(t, hasSummary, "summary should be omitted from update request")
				require.False(t, hasDescription, "description should be omitted from update request")
				// Other fields are still sent.
				require.Equal(t, "High", asMap(fields["priority"])["name"])
			},
		},
		{
			title: "reopen resolved issue on firing alert",
			cfg:   baseCfg(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, false),
			search: issueSearchResult{
				Issues: []issue{
					{Key: "OPS-1", Fields: statusFields("Closed", "done")},
				},
			},
			transitionsGet:   []idNameValue{{ID: "12345", Name: "REOPEN"}},
			expectMethod:     http.MethodPut,
			expectPathSuffix: "/issue/OPS-1",
			expectTransID:    "12345",
		},
		{
			title: "resolve open issue on resolved alert",
			cfg:   baseCfg(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, true),
			search: issueSearchResult{
				Issues: []issue{
					{Key: "OPS-2", Fields: statusFields("Open", "open")},
				},
			},
			transitionsGet:   []idNameValue{{ID: "54321", Name: "CLOSE"}},
			expectMethod:     http.MethodPut,
			expectPathSuffix: "/issue/OPS-2",
			expectTransID:    "54321",
		},
		{
			title: "error resolve transition not found",
			cfg:   baseCfg(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, true),
			search: issueSearchResult{
				Issues: []issue{
					{Key: "OPS-3", Fields: statusFields("Open", "open")},
				},
			},
			transitionsGet:   []idNameValue{},
			expectMethod:     http.MethodPut,
			expectPathSuffix: "/issue/OPS-3",
			errSubstr:        "can't find transition CLOSE for issue OPS-3",
		},
		{
			title: "error reopen transition not found",
			cfg:   baseCfg(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, false),
			search: issueSearchResult{
				Issues: []issue{
					{Key: "OPS-3", Fields: statusFields("Closed", "done")},
				},
			},
			transitionsGet:   []idNameValue{},
			expectMethod:     http.MethodPut,
			expectPathSuffix: "/issue/OPS-3",
			errSubstr:        "can't find transition REOPEN for issue OPS-3",
		},
		{
			title: "create new issue truncates long summary and marshals custom fields",
			cfg: func() *config.JiraConfig {
				c := baseCfg()
				c.Summary = config.JiraFieldConfig{Template: strings.Repeat("A", maxSummaryLenRunes+10)}
				c.Priority = ""
				c.Fields = map[string]any{
					"customfield_10001": "value",
					"customfield_10004": map[string]any{"value": "red"},
				}
				return c
			}(),
			alert: alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, false),
			search: issueSearchResult{
				Issues: []issue{},
			},
			expectMethod:     http.MethodPost,
			expectPathSuffix: "/issue",
			assertBody: func(t *testing.T, fields map[string]any) {
				summary, _ := fields["summary"].(string)
				require.Equal(t, maxSummaryLenRunes, len([]rune(summary)), "summary should be truncated to the rune limit")
				require.True(t, strings.HasSuffix(summary, "…"), "truncated summary should end with ellipsis")
				require.Equal(t, "value", fields["customfield_10001"])
				require.Equal(t, map[string]any{"value": "red"}, fields["customfield_10004"])
			},
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			var (
				capturedFields    map[string]any
				gotMethod         string
				gotPath           string
				appliedTransition string
			)

			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case strings.HasSuffix(r.URL.Path, "/search/jql"):
					require.NoError(t, json.NewEncoder(w).Encode(tc.search))

				case strings.HasSuffix(r.URL.Path, "/transitions"):
					switch r.Method {
					case http.MethodGet:
						require.NoError(t, json.NewEncoder(w).Encode(issueTransitions{Transitions: tc.transitionsGet}))
					case http.MethodPost:
						var out issue
						require.NoError(t, json.NewDecoder(r.Body).Decode(&out))
						require.NotNil(t, out.Transition)
						appliedTransition = out.Transition.ID
						w.WriteHeader(http.StatusNoContent)
					default:
						t.Fatalf("unexpected method %s on transitions", r.Method)
					}

				case strings.HasSuffix(r.URL.Path, "/issue"), strings.Contains(r.URL.Path, "/issue/"):
					gotMethod = r.Method
					gotPath = r.URL.Path
					body, err := io.ReadAll(r.Body)
					require.NoError(t, err)
					var raw map[string]any
					require.NoError(t, json.Unmarshal(body, &raw))
					if fields, ok := raw["fields"].(map[string]any); ok {
						capturedFields = fields
					}
					if r.Method == http.MethodPost {
						w.WriteHeader(http.StatusCreated)
						_, _ = w.Write([]byte(`{"key":"OPS-NEW"}`))
					} else {
						w.WriteHeader(http.StatusNoContent)
					}

				default:
					t.Fatalf("unexpected path %s", r.URL.Path)
				}
			}))
			defer srv.Close()

			n := newNotifierWithConfig(t, tc.cfg, srv.URL)
			ctx := notify.WithGroupKey(context.Background(), "1")
			ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "test"})

			_, err := n.Notify(ctx, tc.alert)
			if tc.errSubstr != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), tc.errSubstr)
				return
			}
			require.NoError(t, err)

			require.Equal(t, tc.expectMethod, gotMethod, "issue request method")
			require.True(t, strings.HasSuffix(gotPath, tc.expectPathSuffix),
				"expected issue path to end with %q, got %q", tc.expectPathSuffix, gotPath)
			if tc.assertBody != nil {
				require.NotNil(t, capturedFields, "expected an issue request body")
				tc.assertBody(t, capturedFields)
			}
			require.Equal(t, tc.expectTransID, appliedTransition, "applied transition id")
		})
	}
}

// TestSearchExistingIssueJQL verifies the JQL that searchExistingIssue builds for
// the various config permutations, adapted from upstream TestSearchExistingIssue.
func TestSearchExistingIssueJQL(t *testing.T) {
	for _, tc := range []struct {
		title       string
		cfg         *config.JiraConfig
		firing      bool
		expectedJQL string
	}{
		{
			title: "firing alert with project template",
			cfg: &config.JiraConfig{
				Project: `{{ .CommonLabels.project }}`,
			},
			firing:      true,
			expectedJQL: `statusCategory != Done and project="PROJ" and labels="ALERT{1}" order by status ASC,resolutiondate DESC`,
		},
		{
			title: "firing alert with reopen duration",
			cfg: &config.JiraConfig{
				Project:          `{{ .CommonLabels.project }}`,
				ReopenDuration:   model.Duration(60 * time.Minute),
				ReopenTransition: "REOPEN",
			},
			firing:      true,
			expectedJQL: `(resolutiondate is EMPTY OR resolutiondate >= -60m) and project="PROJ" and labels="ALERT{1}" order by status ASC,resolutiondate DESC`,
		},
		{
			title: "resolved alert",
			cfg: &config.JiraConfig{
				Project: `{{ .CommonLabels.project }}`,
			},
			firing:      false,
			expectedJQL: `statusCategory != Done and project="PROJ" and labels="ALERT{1}" order by status ASC,resolutiondate DESC`,
		},
		{
			title: "wont_fix_resolution keeps unresolved issues",
			cfg: &config.JiraConfig{
				Project:           `{{ .CommonLabels.project }}`,
				WontFixResolution: "Won't Do",
			},
			firing:      true,
			expectedJQL: `(resolution is EMPTY or resolution != "Won't Do") and statusCategory != Done and project="PROJ" and labels="ALERT{1}" order by status ASC,resolutiondate DESC`,
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			var gotJQL string
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.True(t, strings.HasSuffix(r.URL.Path, "/search/jql"), "unexpected path %s", r.URL.Path)
				var data issueSearch
				require.NoError(t, json.NewDecoder(r.Body).Decode(&data))
				gotJQL = data.JQL
				_, _ = w.Write([]byte(`{"issues": []}`))
			}))
			defer srv.Close()

			n := newNotifierWithConfig(t, tc.cfg, srv.URL)
			s := &session{n: n, conn: (&fakeResolver{access: "tok", cloud: "cloud"}).connection()}

			as := []*types.Alert{alertWith(model.LabelSet{"project": "PROJ"}, false)}
			ctx := notify.WithGroupKey(context.Background(), "1")
			logger := slog.New(slog.DiscardHandler)
			data := notify.GetTemplateData(ctx, n.tmpl, as, logger)
			var tmplErr error
			tmplText := notify.TmplText(n.tmpl, data, &tmplErr)
			tmplTextFunc := func(tmpl string) (string, error) { return tmplText(tmpl), tmplErr }

			issue, retry, err := s.searchExistingIssue(ctx, logger, "1", tc.firing, tmplTextFunc)
			require.NoError(t, err)
			require.False(t, retry)
			require.Nil(t, issue)
			require.Equal(t, tc.expectedJQL, gotJQL)
		})
	}
}

// TestJiraPriority verifies the severity -> priority mapping done by the default
// priority template, adapted from upstream TestJiraPriority.
func TestJiraPriority(t *testing.T) {
	sev := func(s string) *types.Alert {
		return alertWith(model.LabelSet{"alertname": "test", "instance": "vm1", "severity": model.LabelValue(s)}, false)
	}
	resolved := func(s string) *types.Alert {
		return alertWith(model.LabelSet{"alertname": "test", "instance": "vm1", "severity": model.LabelValue(s)}, true)
	}

	for _, tc := range []struct {
		title            string
		alerts           []*types.Alert
		expectedPriority string
	}{
		{"empty", []*types.Alert{alertWith(model.LabelSet{"alertname": "test", "instance": "vm1"}, false)}, ""},
		{"critical", []*types.Alert{sev("critical")}, "High"},
		{"warning", []*types.Alert{sev("warning")}, "Medium"},
		{"info", []*types.Alert{sev("info")}, "Low"},
		{"critical+warning+info", []*types.Alert{sev("critical"), sev("warning"), sev("info")}, "High"},
		{"warning+info", []*types.Alert{sev("warning"), sev("info")}, "Medium"},
		{"critical(resolved)+warning+info", []*types.Alert{resolved("critical"), sev("warning"), sev("info")}, "Medium"},
	} {
		t.Run(tc.title, func(t *testing.T) {
			u, err := url.Parse("http://example.com/")
			require.NoError(t, err)
			tmpl, err := template.FromGlobs([]string{})
			require.NoError(t, err)
			tmpl.ExternalURL = u

			ctx := notify.WithGroupKey(context.Background(), "1")
			data := notify.GetTemplateData(ctx, tmpl, tc.alerts, slog.New(slog.DiscardHandler))
			var tmplErr error
			tmplText := notify.TmplText(tmpl, data, &tmplErr)
			tmplTextFunc := func(tmpl string) (string, error) { return tmplText(tmpl), tmplErr }

			priority, err := tmplTextFunc(`{{ template "jira.default.priority" . }}`)
			require.NoError(t, err)
			require.Equal(t, tc.expectedPriority, priority)
		})
	}
}

// statusFields builds issueFields carrying only a status, as returned by the
// search endpoint (which requests the "status" field).
func statusFields(name, categoryKey string) *issueFields {
	f := &issueFields{Status: &issueStatus{Name: name}}
	f.Status.StatusCategory.Key = categoryKey
	return f
}

func asMap(v any) map[string]any {
	m, _ := v.(map[string]any)
	return m
}

func toStringSlice(v any) []string {
	arr, _ := v.([]any)
	out := make([]string, 0, len(arr))
	for _, e := range arr {
		if s, ok := e.(string); ok {
			out = append(out, s)
		}
	}
	return out
}
