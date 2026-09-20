package aivision

import (
	"fmt"
	"strings"
)

// dashboardStatement is the parameterized OceanBase query and response shape
// for one allow-listed AI Vision dashboard queryKey.
type dashboardStatement struct {
	SQL     string
	Args    []any
	Columns []dashboardColumn
}

// buildCodexDashboardStatement implements the Codex dashboard contract used by
// AI Vision. It deliberately accepts query keys, not caller-provided SQL.
func buildCodexDashboardStatement(store *oceanBaseStore, request dashboardRequest, where string, args []any) (dashboardStatement, bool, error) {
	table := store.logsTable()
	eventName := codexEventNameSQL()
	apiRequest := codexAPIRequestSQL()
	eventKind := logTextAttributeSQL("event.kind")
	sessionID := codexSessionIDSQL()
	model := codexModelSQL()
	appVersion := codexStringAttributeSQL("app.version")
	terminalType := codexStringAttributeSQL("terminal.type")
	toolName := codexStringAttributeSQL("tool_name")
	decision := codexStringAttributeSQL("decision")
	username := codexUsernameSQL()

	statement := dashboardStatement{}
	switch request.QueryKey {
	case "codex.tokens.summary":
		// Active time is turn wall time, which Codex reports on codex.api_request.
		// codex.user_prompt and codex.tool_result rows carry their own duration_ms
		// for per-tile latency; summing every row here would count the same turn
		// several times because tool spans nest inside it.
		statement.SQL = `SELECT
` + logTokenTotalSQL("input_token_count") + ` AS input_tokens,
` + logTokenTotalSQL("output_token_count") + ` AS output_tokens,
` + logTokenTotalSQL("cached_token_count") + ` AS cache_read_tokens,
0 AS cache_creation_tokens,
COALESCE(SUM(CASE WHEN ` + apiRequest + ` THEN ` + logNumberAttributeSQL("duration_ms") + ` ELSE 0 END), 0) AS active_time_ms,
COALESCE(SUM(CASE WHEN ` + apiRequest + ` THEN 1 ELSE 0 END), 0) AS request_count
FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "active_time_ms", "request_count")

	case "codex.sessions.summary":
		statement.SQL = `SELECT
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COUNT(*) AS total_events
FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_sessions", "total_events")

	case "codex.sessions.list":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 50)
		statement.SQL = `SELECT
` + sessionID + ` AS session_id,
COUNT(*) AS logs,
MIN(timestamp DIV 1000000) AS start_time,
MAX(timestamp DIV 1000000) AS end_time,
` + appVersion + ` AS app_version,
` + terminalType + ` AS terminal_type,
` + codexServiceNameSQL() + ` AS service_name
FROM ` + table + ` WHERE ` + where + ` AND ` + sessionID + ` != ''
GROUP BY session_id, app_version, terminal_type, service_name
ORDER BY MIN(timestamp) DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "logs", Type: "number"},
			dashboardColumn{Key: "start_time", Type: "timestamp"},
			dashboardColumn{Key: "end_time", Type: "timestamp"},
			dashboardColumn{Key: "app_version", Type: "string"},
			dashboardColumn{Key: "terminal_type", Type: "string"},
			dashboardColumn{Key: "service_name", Type: "string"},
		)

	case "codex.sessions.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS session_count
FROM ` + table + ` WHERE ` + where + `
GROUP BY time ORDER BY time ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "session_count", Type: "number"})

	case "codex.events.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
COALESCE(NULLIF(` + eventName + `, ''), 'event') AS event_name,
COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + `
GROUP BY time, event_name ORDER BY time ASC, event_name ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "event_name", Type: "string"},
			dashboardColumn{Key: "count", Type: "number"},
		)

	case "codex.user_prompt.detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + codexStringAttributeSQL("prompt") + ` AS prompt,
` + logNumberAttributeSQL("duration_ms") + ` AS cost_ms,
` + logNumberAttributeSQL("prompt_length") + ` AS prompt_length,
` + appVersion + ` AS app_version,
` + terminalType + ` AS terminal_type
FROM ` + table + ` WHERE ` + where + ` AND ` + eventName + ` = 'codex.user_prompt'
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "prompt", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "prompt_length", Type: "number"},
			dashboardColumn{Key: "app_version", Type: "string"},
			dashboardColumn{Key: "terminal_type", Type: "string"},
		)

	case "codex.models.summary":
		statement.SQL = `SELECT
` + model + ` AS model,
COALESCE(SUM(CASE WHEN ` + apiRequest + ` THEN 1 ELSE 0 END), 0) AS request_count,
` + logTokenTotalSQL("input_token_count") + ` AS input_tokens,
` + logTokenTotalSQL("output_token_count") + ` AS output_tokens,
COALESCE(AVG(CASE WHEN ` + apiRequest + ` THEN ` + logOptionalNumberAttributeSQL("duration_ms") + ` END), 0) AS avg_duration_ms
FROM ` + table + ` WHERE ` + where + ` AND (` + apiRequest + ` OR (` + eventName + ` = 'codex.sse_event' AND ` + eventKind + ` = 'response.completed'))
GROUP BY model ORDER BY request_count DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "request_count", Type: "number"},
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "avg_duration_ms", Type: "number"},
		)

	case "codex.models.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + eventName + ` AS event_name,
COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + ` AND ` + apiRequest + `
GROUP BY time, event_name ORDER BY time ASC, event_name ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "event_name", Type: "string"},
			dashboardColumn{Key: "count", Type: "number"},
		)

	case "codex.api.errors":
		statusCode := logOptionalNumberAttributeSQL("http.response.status_code")
		statement.SQL = `SELECT
COUNT(*) AS total_requests,
COALESCE(SUM(CASE WHEN ` + statusCode + ` >= 400 OR LOWER(` + logTextAttributeSQL("success") + `) = 'false' THEN 1 ELSE 0 END), 0) AS error_requests,
COALESCE(SUM(CASE WHEN ` + statusCode + ` >= 500 THEN 1 ELSE 0 END), 0) AS server_errors
FROM ` + table + ` WHERE ` + where + ` AND ` + apiRequest
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_requests", "error_requests", "server_errors")

	case "codex.models.latency_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model,
COALESCE(AVG(` + logOptionalNumberAttributeSQL("duration_ms") + `), 0) AS value
FROM ` + table + ` WHERE ` + where + ` AND ` + apiRequest + `
GROUP BY time, model ORDER BY time ASC, model ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "value", Type: "number"},
		)

	case "codex.models.token_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model,
` + logTokenTotalSQL("input_token_count") + ` AS input_tokens,
` + logTokenTotalSQL("output_token_count") + ` AS output_tokens
FROM ` + table + ` WHERE ` + where + `
AND ` + eventName + ` = 'codex.sse_event'
AND ` + eventKind + ` = 'response.completed'
GROUP BY time, model ORDER BY time ASC, model ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
		)

	case "codex.models.api_detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + model + ` AS model,
` + logNumberAttributeSQL("duration_ms") + ` AS cost_ms,
` + codexEndpointSQL() + ` AS endpoint,
` + codexStringAttributeSQL("http.response.status_code") + ` AS status_code,
` + appVersion + ` AS app_version,
` + terminalType + ` AS terminal_type
FROM ` + table + ` WHERE ` + where + ` AND ` + apiRequest + `
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "endpoint", Type: "string"},
			dashboardColumn{Key: "status_code", Type: "string"},
			dashboardColumn{Key: "app_version", Type: "string"},
			dashboardColumn{Key: "terminal_type", Type: "string"},
		)

	case "codex.tools.summary":
		statement.SQL = `SELECT
` + toolName + ` AS tool_name,
COUNT(*) AS invocation_count,
COALESCE(AVG(` + logOptionalNumberAttributeSQL("duration_ms") + `), 0) AS avg_duration_ms,
COALESCE(AVG(` + logOptionalNumberAttributeSQL("tool_result_size_bytes") + `), 0) AS avg_result_size
FROM ` + table + ` WHERE ` + where + ` AND ` + eventName + ` = 'codex.tool_result'
GROUP BY tool_name ORDER BY invocation_count DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "tool_name", Type: "string"},
			dashboardColumn{Key: "invocation_count", Type: "number"},
			dashboardColumn{Key: "avg_duration_ms", Type: "number"},
			dashboardColumn{Key: "avg_result_size", Type: "number"},
		)

	case "codex.tools.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + toolName + ` AS tool_name,
COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + ` AND ` + eventName + ` = 'codex.tool_decision'
GROUP BY time, tool_name ORDER BY time ASC, tool_name ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "tool_name", Type: "string"},
			dashboardColumn{Key: "count", Type: "number"},
		)

	case "codex.tools.decision_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + decision + ` AS decision,
COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + ` AND ` + eventName + ` = 'codex.tool_decision'
GROUP BY time, decision ORDER BY time ASC, decision ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "decision", Type: "string"},
			dashboardColumn{Key: "count", Type: "number"},
		)

	case "codex.tools.detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + toolName + ` AS tool,
` + logNumberAttributeSQL("duration_ms") + ` AS cost_ms,
` + appVersion + ` AS app_version,
` + terminalType + ` AS terminal_type
FROM ` + table + ` WHERE ` + where + ` AND ` + eventName + ` = 'codex.tool_result'
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "tool", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "app_version", Type: "string"},
			dashboardColumn{Key: "terminal_type", Type: "string"},
		)

	case "codex.team.summary":
		statement.SQL = `SELECT
COUNT(DISTINCT NULLIF(` + username + `, '')) AS total_users,
` + codexTotalTokenSQL() + ` AS total_tokens,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + apiRequest + ` THEN 1 ELSE 0 END), 0) AS request_count
FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_users", "total_tokens", "total_sessions", "request_count")

	case "codex.team.member_ranking":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 50)
		statement.SQL = `SELECT
` + username + ` AS username,
` + codexTotalTokenSQL() + ` AS total_tokens,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + apiRequest + ` THEN 1 ELSE 0 END), 0) AS request_count
FROM ` + table + ` WHERE ` + where + ` AND ` + username + ` != ''
GROUP BY username ORDER BY total_tokens DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "username", Type: "string"},
			dashboardColumn{Key: "total_tokens", Type: "number"},
			dashboardColumn{Key: "total_sessions", Type: "number"},
			dashboardColumn{Key: "request_count", Type: "number"},
		)

	case "codex.team.member_trend", "codex.team.member_trend.users", "codex.team.member_trend.tokens":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
COUNT(DISTINCT NULLIF(` + username + `, '')) AS active_users,
` + codexTotalTokenSQL() + ` AS total_tokens
FROM ` + table + ` WHERE ` + where + `
GROUP BY time ORDER BY time ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "active_users", Type: "number"},
			dashboardColumn{Key: "total_tokens", Type: "number"},
		)

	case "codex.team.model_distribution":
		statement.SQL = `SELECT
` + model + ` AS model,
` + codexTotalTokenSQL() + ` AS total_tokens,
COUNT(*) AS request_count
FROM ` + table + ` WHERE ` + where + `
AND ` + eventName + ` = 'codex.sse_event'
AND ` + eventKind + ` = 'response.completed'
GROUP BY model ORDER BY total_tokens DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "total_tokens", Type: "number"},
			dashboardColumn{Key: "request_count", Type: "number"},
		)

	default:
		return dashboardStatement{}, false, nil
	}

	return statement, true, nil
}

func dashboardBucketSQL() string {
	return "(((timestamp DIV 1000000) DIV ?) * ?)"
}

func prependDashboardStep(args []any, step int64) []any {
	result := make([]any, 0, len(args)+2)
	result = append(result, step, step)
	return append(result, args...)
}

func cloneDashboardArgs(args []any) []any {
	return append([]any(nil), args...)
}

func dashboardLimitDefault(params map[string]any, maxLimit, fallback int) int {
	limit := fallback
	if value, ok := params["limit"]; ok {
		if _, err := fmt.Sscan(strings.TrimSpace(fmt.Sprint(value)), &limit); err != nil || limit <= 0 {
			limit = fallback
		}
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

func timeSeriesColumns(columns ...dashboardColumn) []dashboardColumn {
	return append([]dashboardColumn{{Key: "time", Type: "timestamp"}}, columns...)
}

func codexStringAttributeSQL(key string) string {
	return `COALESCE(NULLIF(` + logTextAttributeSQL(key) + `, ''), '')`
}

func logOptionalNumberAttributeSQL(key string) string {
	return `CAST(NULLIF(` + logTextAttributeSQL(key) + `, '') AS DECIMAL(38,9))`
}

func logTokenTotalSQL(key string) string {
	return `COALESCE(` + logTokenSumSQL(key) + `, 0)`
}

func codexEventNameSQL() string {
	return `COALESCE(NULLIF(event_name, ''), NULLIF(` + logTextAttributeSQL("event.name") + `, ''), '')`
}

// Codex uses HTTP or WebSocket transport. Both are request attempts; token
// usage is reported separately on response.completed events, not these rows.
func codexAPIRequestSQL() string {
	return codexEventNameSQL() + ` IN ('codex.api_request', 'codex.websocket_request')`
}

func codexSessionIDSQL() string {
	return `COALESCE(NULLIF(session_id, ''), NULLIF(` + logTextAttributeSQL("conversation.id") + `, ''), '')`
}

func codexModelSQL() string {
	return `COALESCE(NULLIF(` + logTextAttributeSQL("model") + `, ''), NULLIF(` + logTextAttributeSQL("gen_ai.request.model") + `, ''), 'unknown')`
}

func codexServiceNameSQL() string {
	return `COALESCE(NULLIF(service_name, ''), NULLIF(` + logTextAttributeSQL("service.name") + `, ''), '')`
}

func codexUsernameSQL() string {
	return `COALESCE(NULLIF(user_id, ''), NULLIF(` + logTextAttributeSQL("user.id") + `, ''), '')`
}

func codexEndpointSQL() string {
	return `COALESCE(NULLIF(` + logTextAttributeSQL("endpoint") + `, ''), NULLIF(` + logTextAttributeSQL("http.route") + `, ''), NULLIF(` + logTextAttributeSQL("url.full") + `, ''), '')`
}

func codexTotalTokenSQL() string {
	return `COALESCE(SUM(` + logNumberAttributeSQL("input_token_count") + ` + ` + logNumberAttributeSQL("output_token_count") + `), 0)`
}
