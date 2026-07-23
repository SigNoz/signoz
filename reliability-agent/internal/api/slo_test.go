package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/registry"
	"github.com/guruvedhanth-s/reliability-agent/internal/slo"
)

type apiScalar struct {
	Values map[string]float64
}

func (q apiScalar) Scalar(_ context.Context, expression string, _, _ uint64) (float64, error) {
	return q.Values[expression], nil
}

type apiGate struct{}

func (apiGate) Check(context.Context, string, string, time.Duration, []string) (slo.GateResult, error) {
	return slo.GateResult{Coverage: 1, QueryComplete: true, Trusted: true}, nil
}

func TestEvaluateSLOEndpoint(t *testing.T) {
	engine := slo.NewEngine(apiScalar{Values: map[string]float64{
		"good":  995,
		"total": 1000,
	}}, apiGate{})
	server := httptest.NewServer(NewWithSLO(registry.New(), engine))
	defer server.Close()

	payload := `{"config":{"version":"1","service":"checkout-api","environment":"test","slos":[{"name":"success","type":"ratio","target":0.995,"window":"1h","good_query":"good","total_query":"total","requires_completeness":true,"dependencies":["requests"]}]},"now":"2026-07-22T12:00:00Z"}`
	response, err := http.Post(server.URL+"/v1/slo/evaluate", "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("unexpected status: %s", response.Status)
	}
	var body struct {
		Reports []slo.Report `json:"reports"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Reports) != 1 || body.Reports[0].State != slo.StateHealthy {
		t.Fatalf("unexpected SLO response: %+v", body.Reports)
	}
}
