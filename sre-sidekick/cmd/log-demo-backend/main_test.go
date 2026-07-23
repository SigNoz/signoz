package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type recordingEmitter struct {
	healthy []bool
}

func TestOTLPEmitterUsesCollectorCompatibleHexTraceContext(t *testing.T) {
	var record map[string]any
	collector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			ResourceLogs []struct {
				ScopeLogs []struct {
					LogRecords []map[string]any `json:"logRecords"`
				} `json:"scopeLogs"`
			} `json:"resourceLogs"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		record = payload.ResourceLogs[0].ScopeLogs[0].LogRecords[0]
		w.WriteHeader(http.StatusOK)
	}))
	defer collector.Close()

	emitter := &otlpEmitter{
		endpoint:    collector.URL,
		service:     "log-demo-backend",
		environment: "demo",
		client:      collector.Client(),
	}
	if err := emitter.Emit(context.Background(), true, "test"); err != nil {
		t.Fatal(err)
	}
	traceID, _ := record["traceId"].(string)
	spanID, _ := record["spanId"].(string)
	if len(traceID) != 32 || len(spanID) != 16 || strings.ContainsAny(traceID+spanID, "+/=") {
		t.Fatalf("expected hexadecimal trace context, got trace=%q span=%q", traceID, spanID)
	}
}

func (e *recordingEmitter) Emit(_ context.Context, healthy bool, _ string) error {
	e.healthy = append(e.healthy, healthy)
	return nil
}

func TestHealthRemainsOKWhileTelemetryBecomesUnhealthy(t *testing.T) {
	emitter := &recordingEmitter{}
	server := httptest.NewServer(newDemoServer(emitter).handler())
	defer server.Close()

	response, err := http.Post(server.URL+"/demo/unhealthy", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("unexpected fault response: %s", response.Status)
	}

	health, err := http.Get(server.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer health.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(health.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if health.StatusCode != http.StatusOK || body["application_healthy"] != true {
		t.Fatalf("application health changed: %#v", body)
	}
	if len(emitter.healthy) != 1 || emitter.healthy[0] {
		t.Fatalf("expected one malformed telemetry event, got %#v", emitter.healthy)
	}
}
