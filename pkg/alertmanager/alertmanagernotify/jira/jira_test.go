package jira

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockReq struct {
	method string
	path   string
	body   map[string]any
}

type mockJira struct {
	srv          *httptest.Server
	mu           sync.Mutex
	reqs         []mockReq
	searchIssues []issue
	transitions  []jiraTransition
	createStatus int
}

func newMockJira(t *testing.T) *mockJira {
	t.Helper()
	m := &mockJira{}
	m.srv = httptest.NewServer(http.HandlerFunc(m.handle))
	t.Cleanup(m.srv.Close)
	return m
}

func (m *mockJira) handle(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	m.mu.Lock()
	m.reqs = append(m.reqs, mockReq{r.Method, r.URL.Path, body})
	m.mu.Unlock()

	p := r.URL.Path
	switch {
	case strings.HasSuffix(p, "/search/jql"):
		_ = json.NewEncoder(w).Encode(searchResult{Issues: m.searchIssues})
	case strings.HasSuffix(p, "/transitions") && r.Method == http.MethodGet:
		_ = json.NewEncoder(w).Encode(transitionsResponse{Transitions: m.transitions})
	case strings.HasSuffix(p, "/transitions"):
		w.WriteHeader(http.StatusNoContent)
	case strings.HasSuffix(p, "/comment"):
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":"1"}`))
	case strings.HasSuffix(p, "/issue") && r.Method == http.MethodPost:
		st := m.createStatus
		if st == 0 {
			st = http.StatusCreated
		}
		w.WriteHeader(st)
		_, _ = w.Write([]byte(`{"key":"KAN-1"}`))
	case r.Method == http.MethodPut:
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (m *mockJira) countPost(suffix string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := 0
	for _, r := range m.reqs {
		if r.method == http.MethodPost && strings.HasSuffix(r.path, suffix) {
			c++
		}
	}
	return c
}

func (m *mockJira) countMethod(method string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := 0
	for _, r := range m.reqs {
		if r.method == method {
			c++
		}
	}
	return c
}

func newNotifier(t *testing.T, m *mockJira) *Notifier {
	t.Helper()
	n, err := New(&alertmanagertypes.JiraReceiverConfig{
		Site:           m.srv.URL,
		Project:        "KAN",
		IssueType:      "Task",
		Summary:        alertmanagertypes.DefaultJiraSummaryTemplate,
		Description:    alertmanagertypes.DefaultJiraDescriptionTemplate,
		HTTPConfig:     &commoncfg.HTTPClientConfig{},
		ReopenDuration: model.Duration(3 * 24 * time.Hour),
	}, test.CreateTmpl(t), slog.New(slog.DiscardHandler), nil)
	require.NoError(t, err)
	return n
}

func alert(firing bool) *types.Alert {
	a := &types.Alert{Alert: model.Alert{
		Labels:      model.LabelSet{"alertname": "HighCPU", "severity": "critical"},
		Annotations: model.LabelSet{"summary": "cpu high"},
		StartsAt:    time.Now().Add(-time.Minute),
	}}
	if firing {
		a.EndsAt = time.Now().Add(time.Hour)
	} else {
		a.EndsAt = time.Now().Add(-time.Minute)
	}
	return a
}

func ctx() context.Context {
	return notify.WithGroupKey(context.Background(), "test-jira")
}

func doneIssue() issue {
	i := issue{Key: "KAN-1", Fields: &issueFields{Status: &issueStatus{}}}
	i.Fields.Status.StatusCategory.Key = "done"
	return i
}

func openIssue() issue {
	i := issue{Key: "KAN-1", Fields: &issueFields{Status: &issueStatus{}}}
	i.Fields.Status.StatusCategory.Key = "new"
	return i
}

func transition(id, name, category string) jiraTransition {
	tr := jiraTransition{ID: id, Name: name}
	tr.To.StatusCategory.Key = category
	return tr
}

func TestNotifyCreatesWhenNoExistingIssue(t *testing.T) {
	m := newMockJira(t)
	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.NoError(t, err)
	assert.False(t, retry)
	assert.Equal(t, 1, m.countPost("/issue"))
	assert.Equal(t, 0, m.countPost("/comment"))       // no comment on create
	assert.Equal(t, 0, m.countMethod(http.MethodPut)) // no update
}

func TestNotifyResolvedOnlyWithNoIssueIsNoop(t *testing.T) {
	m := newMockJira(t)
	retry, err := newNotifier(t, m).Notify(ctx(), alert(false))
	require.NoError(t, err)
	assert.False(t, retry)
	assert.Equal(t, 1, m.countPost("/search/jql"))
	assert.Equal(t, 0, m.countPost("/issue"))
}

func TestNotifyStillFiringUpdatesAndComments(t *testing.T) {
	m := newMockJira(t)
	m.searchIssues = []issue{openIssue()}
	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.NoError(t, err)
	assert.False(t, retry)
	assert.Equal(t, 0, m.countPost("/issue"))         // no create
	assert.Equal(t, 1, m.countMethod(http.MethodPut)) // update
	assert.Equal(t, 1, m.countPost("/comment"))
	assert.Equal(t, 0, m.countPost("/transitions")) // still open, no transition

	// comment carries the full rich snapshot (panel + labeled body), not a one-liner.
	cjs, err := json.Marshal(m.lastBody(t, http.MethodPost, "/comment"))
	require.NoError(t, err)
	assert.Contains(t, string(cjs), `"panel"`)
	assert.Contains(t, string(cjs), "Summary:")
}

func TestNotifyResolveTransitionsToDoneAndComments(t *testing.T) {
	m := newMockJira(t)
	m.searchIssues = []issue{openIssue()}
	m.transitions = []jiraTransition{transition("11", "To Do", "new"), transition("41", "Done", "done")}
	retry, err := newNotifier(t, m).Notify(ctx(), alert(false))
	require.NoError(t, err)
	assert.False(t, retry)
	assert.Equal(t, 1, m.countMethod(http.MethodPut)) // update
	assert.Equal(t, 1, m.countPost("/transitions"))   // resolve transition
	assert.Equal(t, 1, m.countPost("/comment"))
}

func TestNotifyReopensDoneIssue(t *testing.T) {
	m := newMockJira(t)
	m.searchIssues = []issue{doneIssue()}
	m.transitions = []jiraTransition{transition("11", "To Do", "new"), transition("41", "Done", "done")}
	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.NoError(t, err)
	assert.False(t, retry)
	assert.Equal(t, 1, m.countPost("/transitions")) // reopen transition
	assert.Equal(t, 1, m.countPost("/comment"))
}

func TestNotifySafeSkipsWhenNoMatchingTransition(t *testing.T) {
	m := newMockJira(t)
	m.searchIssues = []issue{openIssue()}
	m.transitions = []jiraTransition{transition("11", "To Do", "new")} // no done-category transition
	retry, err := newNotifier(t, m).Notify(ctx(), alert(false))
	require.NoError(t, err) // must not error
	assert.False(t, retry)
	assert.Equal(t, 0, m.countPost("/transitions")) // skipped
	assert.Equal(t, 1, m.countPost("/comment"))     // comment still posted
}

func TestNotifyRetriesOn429(t *testing.T) {
	m := newMockJira(t)
	m.createStatus = http.StatusTooManyRequests
	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.Error(t, err)
	assert.True(t, retry)
}

func (m *mockJira) lastBody(t *testing.T, method, suffix string) map[string]any {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := len(m.reqs) - 1; i >= 0; i-- {
		if m.reqs[i].method == method && strings.HasSuffix(m.reqs[i].path, suffix) {
			return m.reqs[i].body
		}
	}
	t.Fatalf("no %s request to %s", method, suffix)
	return nil
}

func TestNotifyRichDescriptionPanelAndLinks(t *testing.T) {
	m := newMockJira(t)
	a := alert(true)
	a.Labels[ruletypes.LabelRuleSource] = model.LabelValue("https://app.signoz.io/alerts?ruleId=1")
	a.Annotations[ruletypes.AnnotationRelatedLogs] = model.LabelValue("https://app.signoz.io/logs")

	_, err := newNotifier(t, m).Notify(ctx(), a)
	require.NoError(t, err)

	body := m.lastBody(t, http.MethodPost, "/issue")
	js, err := json.Marshal(body)
	require.NoError(t, err)
	s := string(js)
	assert.Contains(t, s, `"panel"`)                               // status panel present
	assert.Contains(t, s, `"error"`)                               // firing → error panel
	assert.Contains(t, s, "Open in SigNoz")                        // rule deep-link
	assert.Contains(t, s, "https://app.signoz.io/alerts?ruleId=1") // rule url
	assert.Contains(t, s, "View Related Logs")                     // related-logs deep-link
	assert.Contains(t, s, "Summary:")                              // labeled body section
	assert.Contains(t, s, "cpu high")                              // rendered annotation
}

func TestSelectTransition(t *testing.T) {
	ts := []jiraTransition{
		transition("41", "Done", "done"),
		transition("51", "Won't Do", "done"),
		transition("11", "To Do", "new"),
	}
	assert.Equal(t, "41", selectTransition(ts, true, ""))                                               // first done-category
	assert.Equal(t, "51", selectTransition(ts, true, "Won't Do"))                                       // named override
	assert.Equal(t, "11", selectTransition(ts, false, ""))                                              // first non-done
	assert.Equal(t, "41", selectTransition(ts, true, "Nonexistent"))                                    // bad override → fallback
	assert.Equal(t, "", selectTransition([]jiraTransition{transition("11", "To Do", "new")}, true, "")) // none → skip
}
