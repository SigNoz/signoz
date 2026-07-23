package signoz

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/source"
)

func TestLogSourceQueriesAndNormalizesSigNozLogs(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatal(err)
		}
		encoded, _ := json.Marshal(request)
		if !strings.Contains(string(encoded), "resource.service.name = 'log-demo-backend'") ||
			!strings.Contains(string(encoded), "resource.deployment.environment = 'demo'") {
			t.Fatalf("query is not scoped: %s", encoded)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "success",
			"data": map[string]any{"data": map[string]any{"results": []any{map[string]any{
				"rows": []any{map[string]any{
					"timestamp": "2026-07-23T10:00:00Z",
					"data": map[string]any{
						"body":              "heartbeat",
						"severity_text":     "INFO",
						"trace_id":          "abc123",
						"attributes_string": map[string]any{"telemetry.demo.mode": "healthy"},
						"resources_string":  map[string]any{"service.name": "log-demo-backend"},
					},
				}},
			}}}},
		})
	}))
	defer server.Close()

	snapshot, err := NewLogSource(NewClient(server.URL, "key"), 10).Snapshot(
		context.Background(),
		profile.Profile{},
		source.Target{
			Service:     "log-demo-backend",
			Environment: "demo",
			Start:       time.Date(2026, 7, 23, 9, 59, 0, 0, time.UTC),
			End:         time.Date(2026, 7, 23, 10, 0, 1, 0, time.UTC),
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	if !snapshot.Complete() || len(snapshot.Logs) != 1 {
		t.Fatalf("unexpected snapshot: %+v", snapshot)
	}
	if !snapshot.SignalAvailable("logs") || snapshot.SignalAvailable("traces") {
		t.Fatalf("unexpected signal availability: %+v", snapshot.AvailableSignals)
	}
	fields := snapshot.Logs[0].Fields
	if fields["trace_id"] != "abc123" || fields["service.name"] != "log-demo-backend" {
		t.Fatalf("fields were not flattened: %#v", fields)
	}
	if snapshot.LastSeen["body"].IsZero() || snapshot.DistinctValues["severity_text"] != 1 {
		t.Fatalf("derived evidence is missing: %+v", snapshot)
	}
}

func TestNormalizeLogsMarksLimitSizedResponsesPartial(t *testing.T) {
	var response rawLogsResponse
	response.Status = "success"
	result := struct {
		Rows []struct {
			Timestamp time.Time      `json:"timestamp"`
			Data      map[string]any `json:"data"`
		} `json:"rows"`
	}{}
	result.Rows = append(result.Rows, struct {
		Timestamp time.Time      `json:"timestamp"`
		Data      map[string]any `json:"data"`
	}{
		Timestamp: time.Now(),
		Data:      map[string]any{"body": "one"},
	})
	response.Data.Data.Results = append(response.Data.Data.Results, result)

	snapshot := normalizeLogs(response, 1)
	if snapshot.QueryComplete || !snapshot.Partial || snapshot.Complete() {
		t.Fatalf("limit-sized result must be treated as partial: %+v", snapshot)
	}
}
