package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/audit"
	"github.com/guruvedhanth-s/reliability-agent/internal/evidence"
	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
	"github.com/guruvedhanth-s/reliability-agent/internal/registry"
)

func TestPhaseOneEndToEndWithCompleteFailedAndPartialData(t *testing.T) {
	server := httptest.NewServer(New(registry.New()))
	defer server.Close()

	p := profile.Profile{
		APIVersion: "reliability/v1",
		Kind:       "TelemetryProfile",
		Metadata: profile.Metadata{
			Name:        "checkout-api",
			Service:     "checkout-api",
			Environment: "test",
		},
		Spec: profile.Spec{
			DataKind: "backend",
			Source:   profile.SourceSpec{Adapter: "memory"},
			AuditRules: []profile.RuleSpec{
				{
					ID: "service-name", Type: "required_field", Signal: "traces",
					Field: "service.name", Severity: "blocker",
				},
				{
					ID: "freshness", Type: "freshness", Signal: "metrics",
					Field: "requests", MaxAge: "10m", Severity: "warning",
				},
				{
					ID: "method-cardinality", Type: "cardinality", Signal: "metrics",
					Field: "http.request.method", MaxDistinctValues: 2, Severity: "warning",
				},
			},
		},
	}

	postJSON(t, server.URL+"/v1/profiles", p, nil)
	getResponse(t, server.URL+"/v1/profiles/checkout-api", &profile.Profile{})

	now := time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC)
	complete := evidence.Snapshot{
		QueryComplete: true,
		Traces: []evidence.Record{{
			Selector: "http.server",
			Fields:   map[string]any{"service.name": "checkout-api"},
		}},
		Metrics: []evidence.Record{{
			Selector: "http.server.request.count",
			Fields:   map[string]any{"value": 10},
		}},
		LastSeen:       map[string]time.Time{"requests": now.Add(-2 * time.Minute)},
		DistinctValues: map[string]int{"http.request.method": 2},
	}

	var completeReport audit.Report
	postJSON(t, server.URL+"/v1/audit", map[string]any{
		"profile":  "checkout-api",
		"snapshot": complete,
		"now":      now,
	}, &completeReport)
	if completeReport.OverallStatus != audit.Pass || completeReport.Score != 100 || completeReport.Coverage != 1 {
		t.Fatalf("complete data produced unexpected report: %+v", completeReport)
	}

	failed := complete
	failed.Traces[0].Fields["service.name"] = ""
	failed.LastSeen["requests"] = now.Add(-20 * time.Minute)
	failed.DistinctValues["http.request.method"] = 10
	var failedReport audit.Report
	postJSON(t, server.URL+"/v1/audit", map[string]any{
		"profile":  "checkout-api",
		"snapshot": failed,
		"now":      now,
	}, &failedReport)
	if failedReport.OverallStatus != audit.Fail || failedReport.Score != 75 {
		t.Fatalf("failed data produced unexpected report: %+v", failedReport)
	}

	var partialReport audit.Report
	postJSON(t, server.URL+"/v1/audit", map[string]any{
		"profile": "checkout-api",
		"snapshot": evidence.Snapshot{
			QueryComplete: false,
			Partial:       true,
		},
		"now": now,
	}, &partialReport)
	if partialReport.OverallStatus != audit.Indeterminate || partialReport.QueryComplete {
		t.Fatalf("partial data produced unexpected report: %+v", partialReport)
	}
}

func postJSON(t *testing.T, url string, body any, result any) {
	t.Helper()
	data, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	response, err := http.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		t.Fatalf("POST %s returned %s", url, response.Status)
	}
	if result != nil && json.NewDecoder(response.Body).Decode(result) != nil {
		t.Fatalf("decode response from %s", url)
	}
}

func getResponse(t *testing.T, url string, result any) {
	t.Helper()
	response, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("GET %s returned %s", url, response.Status)
	}
	if err := json.NewDecoder(response.Body).Decode(result); err != nil {
		t.Fatal(err)
	}
}
