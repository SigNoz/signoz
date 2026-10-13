package incidentio

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

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockIncidentIO struct {
	srv    *httptest.Server
	mu     sync.Mutex
	events []alertEvent
	auths  []string
	status int
}

func newMockIncidentIO(t *testing.T) *mockIncidentIO {
	t.Helper()
	m := &mockIncidentIO{status: http.StatusAccepted}
	m.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var ev alertEvent
		_ = json.NewDecoder(r.Body).Decode(&ev)
		m.mu.Lock()
		m.events = append(m.events, ev)
		m.auths = append(m.auths, r.Header.Get("Authorization"))
		status := m.status
		m.mu.Unlock()
		w.WriteHeader(status)
		if status == http.StatusAccepted {
			_, _ = w.Write([]byte(`{"status":"accepted","message":"Event accepted for processing","deduplication_key":"` + ev.DeduplicationKey + `"}`))
		} else {
			_, _ = w.Write([]byte(`{"type":"validation_error","status":422,"errors":[{"code":"is_required","message":"Deduplication key is required"}]}`))
		}
	}))
	t.Cleanup(m.srv.Close)
	return m
}

func (m *mockIncidentIO) lastEvent(t *testing.T) alertEvent {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()
	require.NotEmpty(t, m.events)
	return m.events[len(m.events)-1]
}

func newNotifier(t *testing.T, m *mockIncidentIO) *Notifier {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.IncidentIOReceiverConfig{
		URL:         m.srv.URL + "/v2/alert_events/http/src-1",
		Token:       "tok-1",
		Title:       alertmanagertypes.DefaultIncidentIOTitleTemplate,
		Description: alertmanagertypes.DefaultIncidentIODescriptionTemplate,
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
	}, tmpl, slog.New(slog.DiscardHandler), alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler)))
	require.NoError(t, err)
	return n
}

func alert(firing bool) *types.Alert {
	a := &types.Alert{Alert: model.Alert{
		Labels: model.LabelSet{
			"alertname":  "HighCPU",
			"severity":   "critical",
			"ruleSource": "https://signoz.example/alerts/edit?ruleId=1",
		},
		Annotations:  model.LabelSet{"summary": "cpu high", "related_logs": "https://signoz.example/logs?q=1"},
		GeneratorURL: "https://signoz.example/alerts/edit?ruleId=1",
		StartsAt:     time.Now().Add(-time.Minute),
	}}
	if firing {
		a.EndsAt = time.Now().Add(time.Hour)
	} else {
		a.EndsAt = time.Now().Add(-time.Minute)
	}
	return a
}

func ctx() context.Context {
	return notify.WithGroupKey(context.Background(), "test-incidentio")
}

func TestNotifyFiringEvent(t *testing.T) {
	m := newMockIncidentIO(t)
	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.NoError(t, err)
	assert.False(t, retry)

	ev := m.lastEvent(t)
	assert.Equal(t, "[FIRING:1] HighCPU", ev.Title)
	assert.Equal(t, "firing", ev.Status)
	assert.NotEmpty(t, ev.DeduplicationKey)
	assert.Equal(t, "https://signoz.example/alerts/edit?ruleId=1", ev.SourceURL)
	assert.Contains(t, ev.Description, "**Alert:** HighCPU (critical)")
	assert.Contains(t, ev.Description, "**Summary:** cpu high")
	assert.Contains(t, ev.Description, "[View in SigNoz](https://signoz.example/alerts/edit?ruleId=1)")
	assert.Contains(t, ev.Description, "[View related logs](https://signoz.example/logs?q=1)")
	assert.Equal(t, map[string]string{
		"alertname":  "HighCPU",
		"severity":   "critical",
		"ruleSource": "https://signoz.example/alerts/edit?ruleId=1",
	}, ev.Metadata)
	assert.Equal(t, "Bearer tok-1", m.auths[0])
}

func TestNotifyResolvedEventReusesDedupKey(t *testing.T) {
	m := newMockIncidentIO(t)
	n := newNotifier(t, m)

	_, err := n.Notify(ctx(), alert(true))
	require.NoError(t, err)
	firingKey := m.lastEvent(t).DeduplicationKey

	_, err = n.Notify(ctx(), alert(false))
	require.NoError(t, err)

	ev := m.lastEvent(t)
	assert.Equal(t, "resolved", ev.Status)
	assert.Equal(t, firingKey, ev.DeduplicationKey)
}

func TestNotifyPermanentFailureDoesNotRetry(t *testing.T) {
	m := newMockIncidentIO(t)
	m.status = http.StatusUnprocessableEntity

	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.Error(t, err)
	assert.False(t, retry)
	assert.Contains(t, err.Error(), "Deduplication key is required") // response body surfaces to the user
}

func TestNotifyRateLimitRetries(t *testing.T) {
	m := newMockIncidentIO(t)
	m.status = http.StatusTooManyRequests

	retry, err := newNotifier(t, m).Notify(ctx(), alert(true))
	require.Error(t, err)
	assert.True(t, retry)
}

func TestNotifyMergesChannelMetadata(t *testing.T) {
	m := newMockIncidentIO(t)
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.IncidentIOReceiverConfig{
		URL:         m.srv.URL + "/v2/alert_events/http/src-1",
		Token:       "tok-1",
		Title:       alertmanagertypes.DefaultIncidentIOTitleTemplate,
		Description: alertmanagertypes.DefaultIncidentIODescriptionTemplate,
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
		Metadata: map[string]string{
			"env":       "prod",
			"sev":       "{{ .CommonLabels.severity }}",
			"alertname": "channel-wins",
			"broken":    "{{ .Nope",
		},
	}, tmpl, slog.New(slog.DiscardHandler), alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler)))
	require.NoError(t, err)

	_, err = n.Notify(ctx(), alert(true))
	require.NoError(t, err) // a broken metadata template must not fail delivery

	md := m.lastEvent(t).Metadata
	assert.Equal(t, "prod", md["env"])
	assert.Equal(t, "critical", md["sev"])           // values are template-expanded
	assert.Equal(t, "channel-wins", md["alertname"]) // channel overrides the rule label
	assert.Equal(t, "{{ .Nope", md["broken"])        // unexpandable value sent raw
	assert.Equal(t, "critical", md["severity"])      // rule labels still present
}

func TestNotifyEmptyTitleFallsBackToRuleName(t *testing.T) {
	m := newMockIncidentIO(t)
	tmpl := test.CreateTmpl(t)
	n, err := New(&alertmanagertypes.IncidentIOReceiverConfig{
		URL:         m.srv.URL + "/v2/alert_events/http/src-1",
		Token:       "tok-1",
		Title:       `{{ .CommonLabels.nonexistent }}`,
		Description: alertmanagertypes.DefaultIncidentIODescriptionTemplate,
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
	}, tmpl, slog.New(slog.DiscardHandler), alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler)))
	require.NoError(t, err)

	_, err = n.Notify(ctx(), alert(true))
	require.NoError(t, err)

	assert.Equal(t, "HighCPU", m.lastEvent(t).Title)
}

func TestNotifyTruncatesLongDescription(t *testing.T) {
	m := newMockIncidentIO(t)
	a := alert(true)
	a.Annotations["description"] = model.LabelValue(strings.Repeat("x", maxDescriptionLenRunes+1000))

	_, err := newNotifier(t, m).Notify(ctx(), a)
	require.NoError(t, err)

	desc := []rune(m.lastEvent(t).Description)
	assert.LessOrEqual(t, len(desc), maxDescriptionLenRunes)
	assert.Equal(t, '…', desc[len(desc)-1])
}
