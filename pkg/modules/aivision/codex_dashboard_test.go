package aivision

import (
	"reflect"
	"strings"
	"testing"
)

func TestDashboardWhereIncludesSpaceBoundary(t *testing.T) {
	request := dashboardRequest{
		From:         1_700_000_000_000,
		To:           1_700_003_600_000,
		SpaceID:      "space-7",
		User:         "user-9",
		AgentProduct: "Codex",
	}
	where, args, err := dashboardWhere("org-3", request)
	if err != nil {
		t.Fatal(err)
	}
	wantWhere := "org_id = ? AND timestamp >= ? AND timestamp < ? AND space_id = ? AND user_id = ? AND agent_product = ?"
	if where != wantWhere {
		t.Fatalf("where = %q, want %q", where, wantWhere)
	}
	wantArgs := []any{"org-3", int64(1_700_000_000_000_000_000), int64(1_700_003_600_000_000_000), "space-7", "user-9", "Codex"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", args, wantArgs)
	}
}

func TestDashboardWhereRejectsOversizedSpaceID(t *testing.T) {
	_, _, err := dashboardWhere("default", dashboardRequest{SpaceID: strings.Repeat("x", 256)})
	if err == nil || !strings.Contains(err.Error(), "space_id") {
		t.Fatalf("error = %v, want invalid space_id", err)
	}
}

func TestDashboardWhereRejectsMissingSpaceID(t *testing.T) {
	_, _, err := dashboardWhere("default", dashboardRequest{})
	if err == nil || !strings.Contains(err.Error(), "space_id") {
		t.Fatalf("error = %v, want invalid space_id", err)
	}
}

func TestCodexDashboardStatementsMatchFrontendContracts(t *testing.T) {
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

	contracts := map[string][]string{
		"codex.tokens.summary":            {"input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "active_time_ms", "request_count"},
		"codex.sessions.summary":          {"total_sessions", "total_events"},
		"codex.sessions.list":             {"session_id", "logs", "start_time", "end_time", "app_version", "terminal_type", "service_name"},
		"codex.sessions.timeseries":       {"time", "session_count"},
		"codex.events.timeseries":         {"time", "event_name", "count"},
		"codex.user_prompt.detail":        {"time", "session_id", "prompt", "cost_ms", "prompt_length", "app_version", "terminal_type"},
		"codex.models.summary":            {"model", "request_count", "input_tokens", "output_tokens", "avg_duration_ms"},
		"codex.models.timeseries":         {"time", "event_name", "count"},
		"codex.api.errors":                {"total_requests", "error_requests", "server_errors"},
		"codex.models.latency_timeseries": {"time", "model", "value"},
		"codex.models.token_timeseries":   {"time", "model", "input_tokens", "output_tokens"},
		"codex.models.api_detail":         {"time", "session_id", "model", "cost_ms", "endpoint", "status_code", "app_version", "terminal_type"},
		"codex.tools.summary":             {"tool_name", "invocation_count", "avg_duration_ms", "avg_result_size"},
		"codex.tools.timeseries":          {"time", "tool_name", "count"},
		"codex.tools.decision_timeseries": {"time", "decision", "count"},
		"codex.tools.detail":              {"time", "session_id", "tool", "cost_ms", "app_version", "terminal_type"},
		"codex.team.summary":              {"total_users", "total_tokens", "total_sessions", "request_count"},
		"codex.team.member_ranking":       {"username", "total_tokens", "total_sessions", "request_count"},
		"codex.team.member_trend":         {"time", "active_users", "total_tokens"},
		"codex.team.member_trend.users":   {"time", "active_users", "total_tokens"},
		"codex.team.member_trend.tokens":  {"time", "active_users", "total_tokens"},
		"codex.team.model_distribution":   {"model", "total_tokens", "request_count"},
	}

	for queryKey, wantColumns := range contracts {
		t.Run(queryKey, func(t *testing.T) {
			request.QueryKey = queryKey
			statement, handled, err := buildCodexDashboardStatement(store, request, where, args)
			if err != nil {
				t.Fatal(err)
			}
			if !handled {
				t.Fatal("query key was not handled")
			}
			if !strings.Contains(statement.SQL, "FROM `verify_logs`") {
				t.Fatalf("query does not use the configured logs table: %s", statement.SQL)
			}
			if !strings.Contains(statement.SQL, "space_id = ?") {
				t.Fatalf("query lost the common space boundary: %s", statement.SQL)
			}
			if !containsArgument(statement.Args, "space-7") {
				t.Fatalf("args lost space id: %#v", statement.Args)
			}
			gotColumns := make([]string, 0, len(statement.Columns))
			for _, column := range statement.Columns {
				gotColumns = append(gotColumns, column.Key)
			}
			if !reflect.DeepEqual(gotColumns, wantColumns) {
				t.Fatalf("columns = %#v, want %#v", gotColumns, wantColumns)
			}
		})
	}
}

func TestCodexDashboardStatementRejectsUnknownKey(t *testing.T) {
	store := &oceanBaseStore{cfg: config{TablePrefix: "verify", MaxLimit: 100}}
	statement, handled, err := buildCodexDashboardStatement(store, dashboardRequest{QueryKey: "codex.unknown"}, "org_id = ?", []any{"default"})
	if err != nil {
		t.Fatal(err)
	}
	if handled || statement.SQL != "" {
		t.Fatalf("unknown key unexpectedly handled: %#v", statement)
	}
}

func TestCodexDashboardListLimitIsBounded(t *testing.T) {
	store := &oceanBaseStore{cfg: config{TablePrefix: "verify", MaxLimit: 25}}
	request := dashboardRequest{QueryKey: "codex.models.api_detail", Params: map[string]any{"limit": 9999}}
	statement, handled, err := buildCodexDashboardStatement(store, request, "org_id = ?", []any{"default"})
	if err != nil || !handled {
		t.Fatalf("handled=%v err=%v", handled, err)
	}
	if got := statement.Args[len(statement.Args)-1]; got != 25 {
		t.Fatalf("limit = %#v, want 25", got)
	}
}

func containsArgument(args []any, want any) bool {
	for _, value := range args {
		if reflect.DeepEqual(value, want) {
			return true
		}
	}
	return false
}
