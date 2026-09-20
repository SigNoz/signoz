package aivision

import (
	"strings"
	"testing"
)

func TestTelemetryDashboardStatementsCoverFrontendContracts(t *testing.T) {
	store := &oceanBaseStore{cfg: config{TablePrefix: "verify", MaxLimit: 75}}
	request := dashboardRequest{
		From:    1_700_000_000_000,
		To:      1_700_003_600_000,
		SpaceID: "space-7",
		Params:  map[string]any{"step_ms": 60_000},
	}
	where, args, err := dashboardWhere("org-3", request)
	if err != nil {
		t.Fatal(err)
	}

	staticSuffixes := []string{
		"dashboard.summary", "tokens.summary", "tokens.timeseries",
		"overview.event_stream", "overview.token_by_model",
		"sessions.summary", "sessions.list", "sessions.timeseries", "events.timeseries",
		"user_prompt.detail",
		"models.summary", "models.timeseries", "api.errors", "models.latency_timeseries",
		"models.input_token_timeseries", "models.output_token_timeseries", "models.api_detail",
		"tools.summary", "tools.timeseries", "tools.decision_timeseries", "tools.detail",
		"team.summary", "team.member_ranking", "team.member_trend",
		"team.member_trend.users", "team.member_trend.tokens", "team.model_distribution",
	}
	commonSuffixes := []string{
		"dashboard.summary", "tokens.summary", "tokens.timeseries",
		"overview.event_stream", "overview.token_by_model", "overview.reasoning_by_model",
		"sessions.summary", "sessions.list", "sessions.timeseries", "events.timeseries",
		"user_prompt.detail",
		"models.summary", "models.timeseries", "models.latency_timeseries",
		"models.input_token_timeseries", "models.output_token_timeseries",
		"models.reasoning_token_timeseries", "models.api_detail",
		"tools.summary", "tools.timeseries", "tools.type_timeseries", "tools.detail",
		"team.summary", "team.member_ranking", "team.member_trend",
		"team.member_trend.users", "team.member_trend.tokens", "team.model_distribution",
	}
	dynamicSuffixes := []string{
		"summary", "overview.event_stream", "tokens.timeseries", "overview.token_by_model",
		"sessions.list", "events.timeseries",
		"models.timeseries", "models.latency_timeseries", "models.input_token_timeseries",
		"models.output_token_timeseries", "models.api_detail",
		"tools.summary", "tools.timeseries", "tools.decision_timeseries", "tools.detail",
	}

	families := map[string][]string{
		"claude_code": staticSuffixes,
		"codefuse":    staticSuffixes,
		"common":      commonSuffixes,
		"kimi_cli":    dynamicSuffixes,
		"antigravity": dynamicSuffixes,
	}
	for prefix, suffixes := range families {
		for _, suffix := range suffixes {
			queryKey := prefix + "." + suffix
			t.Run(queryKey, func(t *testing.T) {
				request.QueryKey = queryKey
				statement, handled, err := buildTelemetryDashboardStatement(store, request, where, args)
				if err != nil {
					t.Fatal(err)
				}
				if !handled {
					t.Fatal("frontend query key was not handled")
				}
				if !strings.Contains(statement.SQL, "FROM `verify_logs`") {
					t.Fatalf("query does not use configured logs table: %s", statement.SQL)
				}
				if !strings.Contains(statement.SQL, "space_id = ?") {
					t.Fatalf("query lost mandatory space boundary: %s", statement.SQL)
				}
				if !containsArgument(statement.Args, "space-7") {
					t.Fatalf("args lost space id: %#v", statement.Args)
				}
				assertDashboardColumns(t, statement.Columns, requiredDashboardColumns(suffix))
			})
		}
	}
}

func TestTelemetryDashboardProfilesRejectUnknownKeys(t *testing.T) {
	store := &oceanBaseStore{cfg: config{TablePrefix: "verify", MaxLimit: 100}}
	for _, queryKey := range []string{
		"claude_code.unknown", "codefuse.unknown", "common.unknown",
		"kimi_cli.user_prompt.detail", "antigravity.team.summary", "unknown.summary",
	} {
		t.Run(queryKey, func(t *testing.T) {
			statement, handled, err := buildTelemetryDashboardStatement(
				store,
				dashboardRequest{QueryKey: queryKey},
				"org_id = ? AND space_id = ?",
				[]any{"default", "space-7"},
			)
			if err != nil {
				t.Fatal(err)
			}
			if handled || statement.SQL != "" {
				t.Fatalf("unknown key unexpectedly handled: %#v", statement)
			}
		})
	}
}

func TestTelemetryDashboardFamilySpecificSemantics(t *testing.T) {
	store := &oceanBaseStore{cfg: config{TablePrefix: "verify", MaxLimit: 100}}
	tests := []struct {
		queryKey string
		contains []string
		excludes []string
	}{
		{
			queryKey: "claude_code.dashboard.summary",
			contains: []string{"body_text = 'claude_code.api_request'", `$."cache_creation_tokens"`},
		},
		{
			queryKey: "codefuse.overview.token_by_model",
			contains: []string{`$."cache_read_tokens"`},
		},
		{
			queryKey: "common.models.reasoning_token_timeseries",
			contains: []string{`$."agentic.usage.reasoning_tokens"`},
		},
		{
			queryKey: "kimi_cli.sessions.list",
			contains: []string{`$."agentic.runtime.name"`, `$."gen_ai.conversation.id"`},
		},
		{
			queryKey: "antigravity.tokens.timeseries",
			contains: []string{"SUM(0), 0) AS input_tokens", "SUM(0), 0) AS output_tokens", "SUM(0), 0) AS cache_read_tokens"},
			excludes: []string{"gen_ai.usage.input_tokens", "gen_ai.usage.output_tokens", "agentic.usage.cache_read_tokens"},
		},
	}
	for _, test := range tests {
		t.Run(test.queryKey, func(t *testing.T) {
			statement, handled, err := buildTelemetryDashboardStatement(
				store,
				dashboardRequest{QueryKey: test.queryKey, Params: map[string]any{"step_ms": 60_000}},
				"org_id = ? AND space_id = ?",
				[]any{"default", "space-7"},
			)
			if err != nil || !handled {
				t.Fatalf("handled=%v err=%v", handled, err)
			}
			for _, fragment := range test.contains {
				if !strings.Contains(statement.SQL, fragment) {
					t.Fatalf("SQL does not contain %q: %s", fragment, statement.SQL)
				}
			}
			for _, fragment := range test.excludes {
				if strings.Contains(statement.SQL, fragment) {
					t.Fatalf("SQL unexpectedly contains %q: %s", fragment, statement.SQL)
				}
			}
		})
	}
}

func requiredDashboardColumns(suffix string) []string {
	switch suffix {
	case "dashboard.summary", "summary", "tokens.summary":
		return []string{"input_tokens", "output_tokens", "cache_read_tokens", "active_time_ms", "total_sessions", "request_count"}
	case "overview.event_stream":
		return []string{"time", "event", "cost_ms", "model", "input_tokens", "cache_read_tokens", "output_tokens"}
	case "tokens.timeseries":
		return []string{"time", "input_tokens", "output_tokens", "cache_read_tokens"}
	case "overview.token_by_model", "overview.reasoning_by_model", "models.reasoning_token_timeseries", "models.input_token_timeseries", "models.output_token_timeseries", "models.latency_timeseries":
		return []string{"time", "model", "value"}
	case "sessions.summary":
		return []string{"total_sessions", "total_events"}
	case "sessions.list":
		return []string{"session_id", "logs", "start_time", "end_time"}
	case "sessions.timeseries":
		return []string{"time", "session_count"}
	case "events.timeseries", "models.timeseries":
		return []string{"time", "event_name", "count"}
	case "user_prompt.detail":
		return []string{"time", "session_id", "prompt", "cost_ms", "prompt_length"}
	case "models.summary":
		return []string{"model", "request_count", "input_tokens", "output_tokens", "avg_duration_ms"}
	case "api.errors":
		return []string{"total_requests", "error_requests", "server_errors"}
	case "models.api_detail":
		return []string{"time", "session_id", "model", "cost_ms", "input_tokens", "cache_read_tokens", "output_tokens"}
	case "tools.summary":
		return []string{"tool_name", "invocation_count", "avg_duration_ms"}
	case "tools.timeseries":
		return []string{"time", "tool_name", "count"}
	case "tools.decision_timeseries":
		return []string{"time", "decision", "count"}
	case "tools.type_timeseries":
		return []string{"time", "tool_type", "count"}
	case "tools.detail":
		return []string{"time", "session_id", "tool", "cost_ms"}
	case "team.summary":
		return []string{"total_users", "total_tokens", "total_sessions", "request_count"}
	case "team.member_ranking":
		return []string{"username", "total_tokens", "total_sessions", "request_count"}
	case "team.member_trend", "team.member_trend.users", "team.member_trend.tokens":
		return []string{"time", "active_users", "total_tokens"}
	case "team.model_distribution":
		return []string{"model", "total_tokens", "request_count"}
	default:
		return nil
	}
}

func assertDashboardColumns(t *testing.T, columns []dashboardColumn, required []string) {
	t.Helper()
	got := make(map[string]struct{}, len(columns))
	for _, column := range columns {
		got[column.Key] = struct{}{}
	}
	for _, key := range required {
		if _, ok := got[key]; !ok {
			keys := make([]string, 0, len(columns))
			for _, column := range columns {
				keys = append(keys, column.Key)
			}
			t.Fatalf("columns %v do not contain required key %q", keys, key)
		}
	}
}
