package signoz

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/source"
)

func TestTelemetrySourceCollectsTraceAndMetricSignals(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			CompositeQuery struct {
				Queries []struct {
					Spec struct {
						Signal string `json:"signal"`
					} `json:"spec"`
				} `json:"queries"`
			} `json:"compositeQuery"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatal(err)
		}
		signal := request.CompositeQuery.Queries[0].Spec.Signal
		data := map[string]any{"service.name": "checkout", "name": signal + ".span", "value": 1}
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "success", "data": map[string]any{"data": map[string]any{"results": []any{map[string]any{"rows": []any{map[string]any{"timestamp": time.Now(), "data": data}}}}}}})
	}))
	defer server.Close()
	p := profile.Profile{Metadata: profile.Metadata{Service: "checkout", Environment: "test"}, Spec: profile.Spec{
		AuditRules: []profile.RuleSpec{{ID: "span", Type: "required_span", Signal: "traces", SpanName: "traces.span", Severity: "blocker"}, {ID: "metric", Type: "freshness", Signal: "metrics", Field: "value", MaxAge: "1h", Severity: "warning"}},
	}}
	snapshot, err := NewTelemetrySource(NewClient(server.URL, "key"), 10).Snapshot(context.Background(), p, source.Target{Service: "checkout", Environment: "test", Start: time.Now().Add(-time.Minute), End: time.Now()})
	if err != nil {
		t.Fatal(err)
	}
	if !snapshot.SignalAvailable("traces") || !snapshot.SignalAvailable("metrics") || len(snapshot.Traces) != 1 || len(snapshot.Metrics) != 1 {
		t.Fatalf("signals were not collected: %+v", snapshot)
	}
}
