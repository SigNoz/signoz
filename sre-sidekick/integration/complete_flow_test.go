package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/alerting"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/api"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/audit"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/evidence"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/monitor"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/registry"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/slo"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/source/signoz"
)

const integrationAPIKey = "integration-secret"

func TestCompleteAuthenticatedAPIAndSLOFlow(t *testing.T) {
	signozServer, observedQueries := newScalarSigNozServer(t)
	defer signozServer.Close()

	signozClient := signoz.NewClient(signozServer.URL, "signoz-key")
	sloEngine := slo.NewEngine(
		signozClient,
		slo.NewMetricPresenceGate(signozClient, nil),
	)
	apiServer := httptest.NewServer(api.NewWithOptions(
		registry.New(),
		sloEngine,
		api.Options{APIKey: integrationAPIKey},
	))
	defer apiServer.Close()

	requireStatus(t, http.MethodGet, apiServer.URL+"/healthz", "", nil, http.StatusOK)
	requireStatus(t, http.MethodGet, apiServer.URL+"/v1/profiles", "", nil, http.StatusUnauthorized)

	checkoutProfile := loadProfile(t, "checkout-api.yaml")
	requireStatus(
		t,
		http.MethodPost,
		apiServer.URL+"/v1/profiles",
		integrationAPIKey,
		checkoutProfile,
		http.StatusCreated,
	)
	requireStatus(
		t,
		http.MethodPost,
		apiServer.URL+"/v1/profiles/checkout-api/validate",
		integrationAPIKey,
		nil,
		http.StatusOK,
	)
	requireStatus(
		t,
		http.MethodPost,
		apiServer.URL+"/v1/profiles/checkout-api/activate",
		integrationAPIKey,
		nil,
		http.StatusOK,
	)

	now := time.Now().UTC().Truncate(time.Second)
	auditResponse := requireJSON(t, http.MethodPost, apiServer.URL+"/v1/audit", integrationAPIKey, map[string]any{
		"profile": checkoutProfile.Metadata.Name,
		"snapshot": evidence.Snapshot{
			QueryComplete:    true,
			AvailableSignals: map[string]bool{"traces": true, "metrics": true},
			Traces: []evidence.Record{{
				Selector: "http.server",
				Fields:   map[string]any{"service.name": "checkout-api"},
			}},
			Metrics: []evidence.Record{{
				Selector: "http.server.request.count",
				Fields:   map[string]any{"value": 10},
			}},
			LastSeen: map[string]time.Time{
				"http.server.request.count": now.Add(-time.Minute),
			},
			DistinctValues: map[string]int{"http.request.method": 3},
		},
		"now": now,
	})
	var auditReport audit.Report
	decodeBody(t, auditResponse, &auditReport)
	if auditReport.OverallStatus != audit.Pass || auditReport.Score != 100 {
		t.Fatalf("authenticated audit flow did not pass: %+v", auditReport)
	}

	sloConfig := loadSLOConfig(t, "checkout-slo.yaml")
	sloResponse := requireJSON(t, http.MethodPost, apiServer.URL+"/v1/slo/evaluate", integrationAPIKey, map[string]any{
		"config": sloConfig,
		"now":    now,
	})
	var result struct {
		Reports []slo.Report `json:"reports"`
	}
	decodeBody(t, sloResponse, &result)
	if len(result.Reports) != 2 {
		t.Fatalf("expected two SLO reports, got %+v", result.Reports)
	}
	for _, report := range result.Reports {
		if report.State != slo.StateHealthy || !report.Gate.Trusted {
			t.Fatalf("SLO flow was not healthy and trusted: %+v", report)
		}
	}

	for _, query := range observedQueries() {
		if strings.Contains(query, "count_over_time(") {
			continue
		}
		if !strings.Contains(query, `service_name="checkout-api"`) ||
			!strings.Contains(query, `environment="test"`) {
			t.Fatalf("live SLO query was not scoped: %s", query)
		}
	}
}

func TestCompleteAuditWatchFiringAndRecoveryFlow(t *testing.T) {
	var healthy atomic.Bool
	healthy.Store(true)
	signozServer := newLogsSigNozServer(t, &healthy)
	defer signozServer.Close()

	events := make(chan alerting.Event, 8)
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var event alerting.Event
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			t.Errorf("decode webhook event: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		events <- event
		w.WriteHeader(http.StatusNoContent)
	}))
	defer webhook.Close()

	reports := make(chan audit.Report, 32)
	runnerErrors := make(chan error, 8)
	runner := &monitor.Runner{
		Profile:             loadProfile(t, "log-demo-backend.yaml"),
		Source:              signoz.NewLogSource(signoz.NewClient(signozServer.URL, "signoz-key"), 10),
		Audit:               audit.Engine{},
		Sink:                alerting.WebhookSink{URL: webhook.URL},
		Interval:            10 * time.Millisecond,
		Lookback:            time.Second,
		AlertSeverity:       "blocker",
		FailuresBeforeAlert: 2,
		OnReport: func(report audit.Report) {
			reports <- report
		},
		OnError: func(err error) {
			runnerErrors <- err
		},
	}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- runner.Run(ctx)
	}()
	defer func() {
		cancel()
		select {
		case err := <-done:
			if err != nil {
				t.Errorf("runner stopped with error: %v", err)
			}
		case <-time.After(time.Second):
			t.Error("runner did not stop after cancellation")
		}
	}()

	waitForReportStatus(t, reports, runnerErrors, audit.Pass)
	healthy.Store(false)

	firing := waitForEvent(t, events, runnerErrors)
	if firing.State != "firing" || firing.CurrentStatus != audit.Fail {
		t.Fatalf("unexpected firing event: %+v", firing)
	}
	select {
	case duplicate := <-events:
		t.Fatalf("duplicate firing event was not suppressed: %+v", duplicate)
	case err := <-runnerErrors:
		t.Fatalf("audit runner error: %v", err)
	case <-time.After(50 * time.Millisecond):
	}

	healthy.Store(true)
	resolved := waitForEvent(t, events, runnerErrors)
	if resolved.State != "resolved" || resolved.CurrentStatus != audit.Pass {
		t.Fatalf("unexpected resolved event: %+v", resolved)
	}
}

func newScalarSigNozServer(t *testing.T) (*httptest.Server, func() []string) {
	t.Helper()
	var mu sync.Mutex
	var queries []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v5/query_range" {
			http.NotFound(w, r)
			return
		}
		var request struct {
			CompositeQuery struct {
				Queries []struct {
					Spec struct {
						Query string `json:"query"`
					} `json:"spec"`
				} `json:"queries"`
			} `json:"compositeQuery"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Errorf("decode scalar request: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if len(request.CompositeQuery.Queries) != 1 {
			t.Errorf("unexpected scalar request: %+v", request)
			http.Error(w, "missing query", http.StatusBadRequest)
			return
		}
		query := request.CompositeQuery.Queries[0].Spec.Query
		mu.Lock()
		queries = append(queries, query)
		mu.Unlock()

		value := 1.0
		switch {
		case strings.Contains(query, "count_over_time("):
			value = 1
		case strings.Contains(query, "request_success_total"):
			value = 995
		case strings.Contains(query, "request_total"):
			value = 1000
		case strings.Contains(query, "_bucket"):
			value = 990
		case strings.Contains(query, "_count"):
			value = 1000
		default:
			t.Errorf("unexpected scalar query: %s", query)
		}
		writeJSON(t, w, map[string]any{
			"data": map[string]any{"data": map[string]any{"results": []any{
				map[string]any{"aggregations": []any{
					map[string]any{"series": []any{
						map[string]any{"values": []any{
							map[string]any{"value": value, "partial": false},
						}},
					}},
				}},
			}}},
		})
	}))
	return server, func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), queries...)
	}
}

func newLogsSigNozServer(t *testing.T, healthy *atomic.Bool) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v5/query_range" {
			http.NotFound(w, r)
			return
		}
		data := map[string]any{
			"body":          "heartbeat",
			"severity_text": "INFO",
		}
		if healthy.Load() {
			data["trace_id"] = "0123456789abcdef0123456789abcdef"
		}
		writeJSON(t, w, map[string]any{
			"status": "success",
			"data": map[string]any{"data": map[string]any{"results": []any{
				map[string]any{"rows": []any{
					map[string]any{
						"timestamp": time.Now().UTC(),
						"data":      data,
					},
				}},
			}}},
		})
	}))
}

func loadProfile(t *testing.T, name string) profile.Profile {
	t.Helper()
	loaded, err := profile.LoadFile(filepath.Join("..", "examples", name))
	if err != nil {
		t.Fatal(err)
	}
	return loaded
}

func loadSLOConfig(t *testing.T, name string) slo.Config {
	t.Helper()
	loaded, err := slo.LoadConfig(filepath.Join("..", "examples", name))
	if err != nil {
		t.Fatal(err)
	}
	return loaded
}

func requireStatus(
	t *testing.T,
	method string,
	url string,
	apiKey string,
	body any,
	expected int,
) {
	t.Helper()
	response := requireJSON(t, method, url, apiKey, body)
	defer response.Body.Close()
	if response.StatusCode != expected {
		t.Fatalf("%s %s returned %s", method, url, response.Status)
	}
}

func requireJSON(t *testing.T, method string, url string, apiKey string, body any) *http.Response {
	t.Helper()
	var requestBody bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&requestBody).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	request, err := http.NewRequest(method, url, &requestBody)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if apiKey != "" {
		request.Header.Set("Authorization", "Bearer "+apiKey)
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	return response
}

func decodeBody(t *testing.T, response *http.Response, target any) {
	t.Helper()
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		t.Fatalf("unexpected response status: %s", response.Status)
	}
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		t.Fatal(err)
	}
}

func waitForReportStatus(
	t *testing.T,
	reports <-chan audit.Report,
	errs <-chan error,
	status audit.Status,
) {
	t.Helper()
	timeout := time.NewTimer(2 * time.Second)
	defer timeout.Stop()
	for {
		select {
		case report := <-reports:
			if report.OverallStatus == status {
				return
			}
		case err := <-errs:
			t.Fatalf("audit runner error: %v", err)
		case <-timeout.C:
			t.Fatalf("timed out waiting for audit status %s", status)
		}
	}
}

func waitForEvent(
	t *testing.T,
	events <-chan alerting.Event,
	errs <-chan error,
) alerting.Event {
	t.Helper()
	select {
	case event := <-events:
		return event
	case err := <-errs:
		t.Fatalf("audit runner error: %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for alert event")
	}
	return alerting.Event{}
}

func writeJSON(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Errorf("encode stub response: %v", err)
	}
}

func Example_completeFlow() {
	fmt.Println("profile -> authenticated API -> audit/SLO -> alert webhook")
	// Output: profile -> authenticated API -> audit/SLO -> alert webhook
}
