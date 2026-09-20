package signoz

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/aivision"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func verifyMainAIVision(t *testing.T, ctx context.Context, db *sql.DB, prefix string, org, otherOrg valuer.UUID, start time.Time, settings factory.ProviderSettings, store telemetrystore.TelemetryStore, q querier.Querier, cfg telemetrystore.Config) {
	_, err := db.ExecContext(ctx, "UPDATE `"+prefix+"_traces` SET session_id = 'session-a', user_id = 'user-a', agent_product = 'Codex', attributes = JSON_OBJECT('tokens', 5, 'gen_ai.usage.input_tokens', 3, 'gen_ai.usage.output_tokens', 2, 'gen_ai.input.messages', 'hello', 'gen_ai.output.messages', 'world') WHERE org_id = ?", org.StringValue())
	require.NoError(t, err)
	h := aivision.NewHandler(aivision.NewModule(settings, store, q, cfg))
	identity := map[string]any{"from": start.UnixMilli(), "to": start.Add(time.Minute).UnixMilli(), "space_id": "space-a"}
	urlQuery := fmt.Sprintf("?from=%d&to=%d&space_id=space-a", start.UnixMilli(), start.Add(time.Minute).UnixMilli())
	traceID := "0123456789abcdef0123456789abcdef"
	call := func(fn http.HandlerFunc, method, path string, payload map[string]any) map[string]any {
		t.Helper()
		var body []byte
		if payload != nil {
			body, err = json.Marshal(payload)
			require.NoError(t, err)
		}
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		// A caller-supplied organization cannot supersede authenticated claims.
		r.Header.Set("X-SigNoz-Org-Id", otherOrg.StringValue())
		r = r.WithContext(authtypes.NewContextWithClaims(ctx, authtypes.Claims{OrgID: org.StringValue()}))
		w := httptest.NewRecorder()
		fn(w, r)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var envelope map[string]any
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &envelope))
		require.Equal(t, "success", envelope["status"])
		return envelope["data"].(map[string]any)
	}
	traces := call(h.Traces, "GET", "/api/v1/ai-vision/traces"+urlQuery, nil)
	require.EqualValues(t, 1, traces["meta"].(map[string]any)["totalItems"])
	detail := call(h.TraceDetail, "GET", "/api/v1/ai-vision/traces/"+traceID+urlQuery, nil)
	require.Len(t, detail["spans"], 1)
	span := detail["spans"].([]any)[0].(map[string]any)
	require.Equal(t, "hello", span["attributes"].(map[string]any)["gen_ai.input.messages"])
	require.Len(t, span["events"], 1)
	sessions := call(h.Sessions, "GET", "/api/v1/ai-vision/sessions"+urlQuery, nil)
	require.EqualValues(t, 1, sessions["meta"].(map[string]any)["totalItems"])
	session := call(h.SessionDetail, "GET", "/api/v1/ai-vision/sessions/session-a"+urlQuery+"&include_spans=true", nil)
	require.EqualValues(t, 1, session["traceCount"])
	require.Len(t, session["spans"], 1)
	for _, test := range []struct {
		name, idKey string
		ids         []string
		fn          http.HandlerFunc
	}{
		{"trace IO", "trace_ids", []string{traceID}, h.TraceIOBatch},
		{"trace usage", "trace_ids", []string{traceID}, h.TraceUsageBatch},
		{"session IO", "session_ids", []string{"session-a"}, h.SessionIOBatch},
		{"session usage", "session_ids", []string{"session-a"}, h.SessionUsageBatch},
	} {
		t.Run(test.name, func(t *testing.T) {
			payload := map[string]any{}
			for key, value := range identity {
				payload[key] = value
			}
			payload[test.idKey] = test.ids
			data := call(test.fn, "POST", "/batch", payload)["data"].([]any)
			require.Len(t, data, 1)
			item := data[0].(map[string]any)
			if strings.Contains(test.name, "usage") {
				require.EqualValues(t, 5, item["totalTokens"])
			} else {
				require.Equal(t, "hello", item["input"])
			}
		})
	}
	spanBatch := map[string]any{"from": identity["from"], "to": identity["to"], "space_id": "space-a", "trace_id": traceID, "span_ids": []string{"0123456789abcdef"}}
	require.Len(t, call(h.SpanBatch, "POST", "/batch", spanBatch)["spans"], 1)
	for _, otherScope := range []string{strings.ReplaceAll(urlQuery, "space-a", "missing"), urlQuery + "&user=missing"} {
		missing := call(h.Traces, "GET", "/api/v1/ai-vision/traces"+otherScope, nil)
		require.EqualValues(t, 0, missing["meta"].(map[string]any)["totalItems"])
	}
	call(h.TraceFacets, "GET", "/api/v1/ai-vision/traces/facets"+urlQuery, nil)
	eventRequest := map[string]any{"from": identity["from"], "to": identity["to"], "space_id": "space-a", "agent_product": "Codex", "page": 1, "limit": 10}
	call(h.EventsList, "POST", "/events", eventRequest)
	call(h.EventsMetadata, "GET", "/events/metadata?space_id=space-a&agent_product=Codex", nil)
	metric := map[string]any{"queryKey": "telemetry.metrics.timeseries", "from": identity["from"], "to": identity["to"], "space_id": "space-a", "params": map[string]any{"metric_name": "test.gauge", "aggregation": "avg", "step_ms": 60000}}
	metricResult := call(h.Dashboard, "POST", "/dashboard", metric)
	require.NotEmpty(t, metricResult["rows"])
	require.EqualValues(t, 6, metricResult["rows"].([]any)[0].(map[string]any)["value"])
	metric["params"].(map[string]any)["aggregation"] = "count"
	metricCount := call(h.Dashboard, "POST", "/dashboard", metric)
	require.EqualValues(t, 3, metricCount["rows"].([]any)[0].(map[string]any)["value"])
	verifyDashboardFamilies(t, ctx, db, prefix, org, start, h.Dashboard)
	w := httptest.NewRecorder()
	h.Traces(w, httptest.NewRequest("GET", "/api/v1/ai-vision/traces"+urlQuery, nil))
	require.Equal(t, http.StatusUnauthorized, w.Code)
}
