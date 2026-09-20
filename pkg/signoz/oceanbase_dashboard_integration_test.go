package signoz

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// These are frontend query contracts, not a traversal of the implementation's
// registry. Every key executes against real OceanBase through the main module,
// shared Querier executor and production TelemetryStore in the parent test.
func verifyDashboardFamilies(t *testing.T, ctx context.Context, db *sql.DB, prefix string, org valuer.UUID, start time.Time, handler http.HandlerFunc) {
	full := strings.Fields(`dashboard.summary tokens.summary tokens.timeseries
overview.event_stream overview.token_by_model sessions.summary sessions.list
sessions.timeseries events.timeseries user_prompt.detail models.summary
models.timeseries models.latency_timeseries models.input_token_timeseries
models.output_token_timeseries models.api_detail api.errors tools.summary
tools.timeseries tools.decision_timeseries tools.detail team.summary
team.member_ranking team.member_trend team.member_trend.users
team.member_trend.tokens team.model_distribution`)
	common := strings.Fields(`dashboard.summary tokens.summary tokens.timeseries
overview.event_stream overview.token_by_model overview.reasoning_by_model
sessions.summary sessions.list sessions.timeseries events.timeseries
user_prompt.detail models.summary models.timeseries models.latency_timeseries
models.input_token_timeseries models.output_token_timeseries
models.reasoning_token_timeseries models.api_detail tools.summary
tools.timeseries tools.type_timeseries tools.detail team.summary
team.member_ranking team.member_trend team.member_trend.users
team.member_trend.tokens team.model_distribution`)
	dynamic := strings.Fields(`summary overview.event_stream tokens.timeseries
overview.token_by_model sessions.list events.timeseries models.timeseries
models.latency_timeseries models.input_token_timeseries
models.output_token_timeseries models.api_detail tools.summary
tools.timeseries tools.decision_timeseries tools.detail`)
	families := []struct {
		name string
		keys []string
	}{{"claude_code", full}, {"codefuse", full}, {"common", common}, {"kimi_cli", dynamic}, {"antigravity", dynamic}}
	for _, family := range families {
		t.Run(family.name, func(t *testing.T) {
			insert := func(owner, space, user string, offset int, attrs map[string]any) {
				t.Helper()
				encoded, err := json.Marshal(attrs)
				require.NoError(t, err)
				stamp := start.Add(time.Duration(offset) * time.Second).UnixNano()
				_, err = db.ExecContext(ctx, "INSERT INTO `"+prefix+"_logs` (org_id, space_id, user_id, agent_product, session_id, log_id, timestamp, timestamp_unix_nano, observed_time_unix_nano, body_text, body, body_json, scope_attributes, resource_attributes, attributes, payload, event_name, service_name) VALUES (?, ?, ?, ?, 'dashboard-session', ?, ?, ?, ?, '', '', '{}', '{}', '{}', ?, '{}', ?, 'dashboard-service')", owner, space, user, family.name, valuer.GenerateUUID().StringValue(), stamp, stamp, stamp, string(encoded), attrs["event.name"])
				require.NoError(t, err)
			}
			for i, attrs := range []map[string]any{
				{"event.name": "api_request", "model": "model-a", "input_tokens": 10, "output_tokens": 4, "cache_read_tokens": 2, "cache_creation_tokens": 1, "agentic.usage.reasoning_tokens": 3, "duration_ms": 100, "status_code": 200},
				{"event.name": "api_request", "model": "model-a", "input_tokens": 20, "output_tokens": 6, "cache_read_tokens": 3, "cache_creation_tokens": 2, "agentic.usage.reasoning_tokens": 4, "duration_ms": 200, "status_code": 500},
				{"event.name": "tool_result", "tool_name": "test-tool", "tool_type": "shell", "decision": "allow", "tool.success": true, "duration_ms": 12, "result_size_bytes": 256},
				{"event.name": "tool_decision", "tool_name": "test-tool", "tool_type": "shell", "decision": "allow", "duration_ms": 12, "result_size_bytes": 256},
				{"event.name": "user_prompt", "prompt": "dashboard prompt", "prompt_length": 16},
			} {
				insert(org.StringValue(), "dashboard-space", "dashboard-user", i+1, attrs)
			}
			// Positive totals must exclude every one of these otherwise-identical
			// sentinels. Family scoping also excludes the other families' fixtures.
			for _, scope := range [][3]string{
				{valuer.GenerateUUID().StringValue(), "dashboard-space", "dashboard-user"},
				{org.StringValue(), "other-space", "dashboard-user"},
				{org.StringValue(), "dashboard-space", "other-user"},
			} {
				insert(scope[0], scope[1], scope[2], 6, map[string]any{"event.name": "api_request", "model": "model-a", "input_tokens": 1000})
			}
			for _, key := range family.keys {
				t.Run(key, func(t *testing.T) {
					payload, err := json.Marshal(map[string]any{
						"queryKey": family.name + "." + key, "from": start.UnixMilli(), "to": start.Add(time.Minute).UnixMilli(),
						"space_id": "dashboard-space", "user": "dashboard-user", "agent_product": family.name,
						"params": map[string]any{"step_ms": 60000},
					})
					require.NoError(t, err)
					r := httptest.NewRequest("POST", "/api/v1/ai-vision/dashboard/query", bytes.NewReader(payload))
					r = r.WithContext(authtypes.NewContextWithClaims(ctx, authtypes.Claims{OrgID: org.StringValue()}))
					w := httptest.NewRecorder()
					handler(w, r)
					require.Equal(t, http.StatusOK, w.Code, w.Body.String())
					var envelope struct {
						Data struct {
							Columns []map[string]any `json:"columns"`
							Rows    []map[string]any `json:"rows"`
						} `json:"data"`
					}
					require.NoError(t, json.Unmarshal(w.Body.Bytes(), &envelope))
					require.NotEmpty(t, envelope.Data.Columns)
					require.NotEmpty(t, envelope.Data.Rows, "a populated contract must not pass as empty success")
					row := envelope.Data.Rows[0]
					for _, column := range envelope.Data.Columns {
						require.Contains(t, row, column["key"])
					}
					switch key {
					case "dashboard.summary", "summary", "tokens.summary":
						require.EqualValues(t, 2, row["request_count"])
						require.EqualValues(t, 1, row["total_sessions"])
						require.EqualValues(t, 1, row["total_users"])
						if family.name != "antigravity" {
							require.EqualValues(t, 30, row["input_tokens"])
							require.EqualValues(t, 10, row["output_tokens"])
						}
					case "sessions.list":
						require.Equal(t, "dashboard-session", row["session_id"])
						require.EqualValues(t, 5, row["logs"])
					case "models.latency_timeseries":
						require.EqualValues(t, 150, row["value"])
					case "models.summary":
						require.EqualValues(t, 2, row["request_count"])
						require.EqualValues(t, 1, row["error_count"])
					case "api.errors":
						require.EqualValues(t, 2, row["total_requests"])
						require.EqualValues(t, 1, row["server_errors"])
					case "tools.summary":
						require.Equal(t, "test-tool", row["tool_name"])
						require.EqualValues(t, 1, row["invocation_count"])
					case "user_prompt.detail":
						require.Equal(t, "dashboard prompt", row["prompt"])
					case "team.summary", "team.member_ranking", "team.model_distribution":
						want := 40
						if family.name == "claude_code" {
							want += 8 // Claude's team total includes both cache types.
						}
						require.EqualValues(t, want, row["total_tokens"])
					}
				})
			}
		})
	}
}
