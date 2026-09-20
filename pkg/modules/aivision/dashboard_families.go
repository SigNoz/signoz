package aivision

import "strings"

type telemetryDashboardProfile struct {
	prefix                   string
	allowed                  map[string]struct{}
	apiEvent                 string
	apiBody                  string
	toolResultEvent          string
	toolResultBody           string
	toolTrendEvent           string
	toolTrendBody            string
	promptEvent              string
	promptBody               string
	sessionKeys              []string
	modelKeys                []string
	inputTokenKeys           []string
	outputTokenKeys          []string
	cacheReadTokenKeys       []string
	cacheCreationTokenKeys   []string
	reasoningTokenKeys       []string
	inputSeriesIncludesCache bool
	modelTotalIncludesCache  bool
	teamTotalIncludesCache   bool
	serviceKeys              []string
	runtimeKeys              []string
	toolNameKeys             []string
	toolDecisionKeys         []string
	toolTypeKeys             []string
}

var fullDashboardSuffixes = dashboardSuffixSet(
	"dashboard.summary", "tokens.summary", "tokens.timeseries",
	"overview.event_stream", "overview.token_by_model",
	"sessions.summary", "sessions.list", "sessions.timeseries", "events.timeseries",
	"user_prompt.detail",
	"models.summary", "models.timeseries", "models.latency_timeseries",
	"models.input_token_timeseries", "models.output_token_timeseries", "models.api_detail",
	"api.errors",
	"tools.summary", "tools.timeseries", "tools.decision_timeseries", "tools.detail",
	"team.summary", "team.member_ranking", "team.member_trend",
	"team.member_trend.users", "team.member_trend.tokens", "team.model_distribution",
)

var commonDashboardSuffixes = dashboardSuffixSet(
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
)

var otelAgentDashboardSuffixes = dashboardSuffixSet(
	"summary", "overview.event_stream", "tokens.timeseries", "overview.token_by_model",
	"sessions.list", "events.timeseries",
	"models.timeseries", "models.latency_timeseries", "models.input_token_timeseries",
	"models.output_token_timeseries", "models.api_detail",
	"tools.summary", "tools.timeseries", "tools.decision_timeseries", "tools.detail",
)

var telemetryDashboardProfiles = []telemetryDashboardProfile{
	{
		prefix: "claude_code", allowed: fullDashboardSuffixes,
		apiEvent: "api_request", apiBody: "claude_code.api_request",
		toolResultEvent: "tool_result", toolResultBody: "claude_code.tool_result",
		toolTrendEvent: "tool_decision", toolTrendBody: "claude_code.tool_decision",
		promptEvent: "user_prompt", promptBody: "claude_code.user_prompt",
		sessionKeys:              []string{"session.id", "gen_ai.conversation.id", "conversation.id"},
		modelKeys:                []string{"model", "gen_ai.request.model"},
		inputTokenKeys:           []string{"input_tokens", "gen_ai.usage.input_tokens", "input_token_count"},
		outputTokenKeys:          []string{"output_tokens", "gen_ai.usage.output_tokens", "output_token_count"},
		cacheReadTokenKeys:       []string{"cache_read_tokens", "agentic.usage.cache_read_tokens", "cached_token_count"},
		cacheCreationTokenKeys:   []string{"cache_creation_tokens", "agentic.usage.cache_creation_tokens"},
		inputSeriesIncludesCache: true, modelTotalIncludesCache: true, teamTotalIncludesCache: true,
		serviceKeys:      []string{"service.name"},
		toolNameKeys:     []string{"tool_name", "agentic.tool.name"},
		toolDecisionKeys: []string{"decision", "agentic.tool.decision"},
		toolTypeKeys:     []string{"agentic.tool.type", "tool_type"},
	},
	{
		prefix: "codefuse", allowed: fullDashboardSuffixes,
		apiEvent: "api_request", toolResultEvent: "tool_result", toolTrendEvent: "tool_decision", promptEvent: "user_prompt",
		sessionKeys:              []string{"session.id", "gen_ai.conversation.id", "conversation.id"},
		modelKeys:                []string{"model", "gen_ai.request.model"},
		inputTokenKeys:           []string{"input_tokens", "gen_ai.usage.input_tokens", "input_token_count"},
		outputTokenKeys:          []string{"output_tokens", "gen_ai.usage.output_tokens", "output_token_count"},
		cacheReadTokenKeys:       []string{"cache_read_tokens", "agentic.usage.cache_read_tokens", "cached_token_count"},
		inputSeriesIncludesCache: true, modelTotalIncludesCache: true,
		serviceKeys:      []string{"service.name"},
		toolNameKeys:     []string{"tool_name", "agentic.tool.name"},
		toolDecisionKeys: []string{"decision", "agentic.tool.decision"},
		toolTypeKeys:     []string{"agentic.tool.type", "tool_type"},
	},
	{
		prefix: "common", allowed: commonDashboardSuffixes,
		apiEvent: "api_request", toolResultEvent: "tool_result", toolTrendEvent: "tool_result", promptEvent: "user_prompt",
		sessionKeys:        []string{"gen_ai.conversation.id", "session.id", "conversation.id"},
		modelKeys:          []string{"gen_ai.request.model", "model"},
		inputTokenKeys:     []string{"gen_ai.usage.input_tokens", "input_tokens", "input_token_count"},
		outputTokenKeys:    []string{"gen_ai.usage.output_tokens", "output_tokens", "output_token_count"},
		cacheReadTokenKeys: []string{"agentic.usage.cache_read_tokens", "cache_read_tokens", "cached_token_count"},
		reasoningTokenKeys: []string{"agentic.usage.reasoning_tokens", "gen_ai.usage.reasoning_tokens"},
		serviceKeys:        []string{"service.name"},
		toolNameKeys:       []string{"agentic.tool.name", "tool_name"},
		toolDecisionKeys:   []string{"agentic.tool.decision", "decision"},
		toolTypeKeys:       []string{"agentic.tool.type", "tool_type"},
	},
	{
		prefix: "kimi_cli", allowed: otelAgentDashboardSuffixes,
		apiEvent: "api_request", toolResultEvent: "tool_decision", toolTrendEvent: "tool_decision",
		sessionKeys:              []string{"gen_ai.conversation.id", "session.id", "conversation.id"},
		modelKeys:                []string{"gen_ai.request.model", "model"},
		inputTokenKeys:           []string{"gen_ai.usage.input_tokens", "input_tokens", "input_token_count"},
		outputTokenKeys:          []string{"gen_ai.usage.output_tokens", "output_tokens", "output_token_count"},
		cacheReadTokenKeys:       []string{"agentic.usage.cache_read_tokens", "cache_read_tokens", "cached_token_count"},
		inputSeriesIncludesCache: true, modelTotalIncludesCache: true,
		serviceKeys: []string{"service.name"}, runtimeKeys: []string{"agentic.runtime.name"},
		toolNameKeys:     []string{"agentic.tool.name", "tool_name"},
		toolDecisionKeys: []string{"agentic.tool.decision", "decision"},
		toolTypeKeys:     []string{"agentic.tool.type", "tool_type"},
	},
	{
		prefix: "antigravity", allowed: otelAgentDashboardSuffixes,
		apiEvent: "api_request", toolResultEvent: "tool_result", toolTrendEvent: "tool_result",
		sessionKeys: []string{"gen_ai.conversation.id", "session.id", "conversation.id"},
		modelKeys:   []string{"gen_ai.request.model", "model"},
		serviceKeys: []string{"service.name"}, runtimeKeys: []string{"agentic.runtime.name"},
		toolNameKeys:     []string{"agentic.tool.name", "tool_name"},
		toolDecisionKeys: []string{"tool.success", "agentic.tool.decision", "decision"},
		toolTypeKeys:     []string{"agentic.tool.type", "tool_type"},
	},
}

func dashboardSuffixSet(values ...string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, value := range values {
		result[value] = struct{}{}
	}
	return result
}

func dashboardProfileForKey(queryKey string) (telemetryDashboardProfile, string, bool) {
	for _, profile := range telemetryDashboardProfiles {
		prefix := profile.prefix + "."
		if !strings.HasPrefix(queryKey, prefix) {
			continue
		}
		suffix := strings.TrimPrefix(queryKey, prefix)
		if _, ok := profile.allowed[suffix]; ok {
			return profile, suffix, true
		}
		return telemetryDashboardProfile{}, "", false
	}
	return telemetryDashboardProfile{}, "", false
}

// buildTelemetryDashboardStatement is shared by the Claude Code, CodeFuse,
// common OTel, Kimi CLI and Antigravity dashboard families.
func buildTelemetryDashboardStatement(store *oceanBaseStore, request dashboardRequest, where string, args []any) (dashboardStatement, bool, error) {
	profile, suffix, ok := dashboardProfileForKey(request.QueryKey)
	if !ok {
		return dashboardStatement{}, false, nil
	}

	table := store.logsTable()
	eventName := codexEventNameSQL()
	sessionID := telemetrySessionIDSQL(profile)
	model := telemetryTextSQL(profile.modelKeys...)
	serviceName := telemetryServiceNameSQL(profile)
	toolName := telemetryTextSQL(profile.toolNameKeys...)
	toolDecision := telemetryTextSQL(profile.toolDecisionKeys...)
	toolType := telemetryTextSQL(profile.toolTypeKeys...)
	inputTokens := telemetryNumberSQL(profile.inputTokenKeys...)
	outputTokens := telemetryNumberSQL(profile.outputTokenKeys...)
	cacheReadTokens := telemetryNumberSQL(profile.cacheReadTokenKeys...)
	cacheCreationTokens := telemetryNumberSQL(profile.cacheCreationTokenKeys...)
	reasoningTokens := telemetryNumberSQL(profile.reasoningTokenKeys...)
	duration := telemetryNumberSQL("duration_ms", "gen_ai.duration_ms")
	apiCondition := telemetryEventCondition(eventName, profile.apiEvent, profile.apiBody)
	toolResultCondition := telemetryEventCondition(eventName, profile.toolResultEvent, profile.toolResultBody)
	toolTrendCondition := telemetryEventCondition(eventName, profile.toolTrendEvent, profile.toolTrendBody)
	promptCondition := telemetryEventCondition(eventName, profile.promptEvent, profile.promptBody)
	username := telemetryUsernameSQL()

	statement := dashboardStatement{}
	switch suffix {
	case "dashboard.summary", "summary", "tokens.summary":
		statement.SQL = `SELECT
` + telemetrySumSQL(inputTokens) + ` AS input_tokens,
` + telemetrySumSQL(outputTokens) + ` AS output_tokens,
` + telemetrySumSQL(cacheReadTokens) + ` AS cache_read_tokens,
` + telemetrySumSQL(cacheCreationTokens) + ` AS cache_creation_tokens,
` + telemetrySumSQL(reasoningTokens) + ` AS reasoning_tokens,
` + telemetrySumSQL(duration) + ` AS active_time_ms,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + apiCondition + ` THEN 1 ELSE 0 END), 0) AS request_count,
COUNT(DISTINCT NULLIF(` + username + `, '')) AS total_users
FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "reasoning_tokens", "active_time_ms", "total_sessions", "request_count", "total_users")

	case "overview.event_stream":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
COALESCE(NULLIF(` + eventName + `, ''), NULLIF(body_text, ''), 'event') AS event,
` + duration + ` AS cost_ms,
` + model + ` AS model,
` + inputTokens + ` AS input_tokens,
` + cacheReadTokens + ` AS cache_read_tokens,
` + cacheCreationTokens + ` AS cache_creation_tokens,
` + outputTokens + ` AS output_tokens,
` + reasoningTokens + ` AS reasoning_tokens
FROM ` + table + ` WHERE ` + where + ` ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "event", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "cache_read_tokens", Type: "number"},
			dashboardColumn{Key: "cache_creation_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "reasoning_tokens", Type: "number"},
		)

	case "tokens.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + telemetrySumSQL(inputTokens) + ` AS input_tokens,
` + telemetrySumSQL(outputTokens) + ` AS output_tokens,
` + telemetrySumSQL(cacheReadTokens) + ` AS cache_read_tokens,
` + telemetrySumSQL(cacheCreationTokens) + ` AS cache_creation_tokens,
` + telemetrySumSQL(reasoningTokens) + ` AS reasoning_tokens
FROM ` + table + ` WHERE ` + where + ` GROUP BY time ORDER BY time ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "cache_read_tokens", Type: "number"},
			dashboardColumn{Key: "cache_creation_tokens", Type: "number"},
			dashboardColumn{Key: "reasoning_tokens", Type: "number"},
		)

	case "overview.token_by_model":
		step := dashboardStepMS(request.Params, request.To-request.From)
		total := telemetrySumSQL(inputTokens) + " + " + telemetrySumSQL(outputTokens)
		if profile.modelTotalIncludesCache {
			total += " + " + telemetrySumSQL(cacheReadTokens) + " + " + telemetrySumSQL(cacheCreationTokens)
		}
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model,
` + total + ` AS value
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY time, model ORDER BY time ASC, model ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "value", Type: "number"})

	case "overview.reasoning_by_model", "models.reasoning_token_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT
` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model,
` + telemetrySumSQL(reasoningTokens) + ` AS value
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY time, model ORDER BY time ASC, model ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "value", Type: "number"})

	case "sessions.summary":
		statement.SQL = `SELECT COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COUNT(*) AS total_events FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_sessions", "total_events")

	case "sessions.list":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 50)
		statement.SQL = `SELECT
` + sessionID + ` AS session_id,
COUNT(*) AS logs,
MIN(timestamp DIV 1000000) AS start_time,
MAX(timestamp DIV 1000000) AS end_time,
` + serviceName + ` AS service_name,
` + telemetryTextSQL(profile.runtimeKeys...) + ` AS runtime_name,
` + telemetryResourceTextSQL("os.version") + ` AS os_version,
` + telemetryResourceTextSQL("os.type") + ` AS os_type
FROM ` + table + ` WHERE ` + where + ` AND ` + sessionID + ` != ''
GROUP BY session_id, service_name, runtime_name, os_version, os_type
ORDER BY MIN(timestamp) DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "logs", Type: "number"},
			dashboardColumn{Key: "start_time", Type: "timestamp"},
			dashboardColumn{Key: "end_time", Type: "timestamp"},
			dashboardColumn{Key: "service_name", Type: "string"},
			dashboardColumn{Key: "runtime_name", Type: "string"},
			dashboardColumn{Key: "os_version", Type: "string"},
			dashboardColumn{Key: "os_type", Type: "string"},
		)

	case "sessions.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT ` + dashboardBucketSQL() + ` AS time,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS session_count
FROM ` + table + ` WHERE ` + where + ` GROUP BY time ORDER BY time ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "session_count", Type: "number"})

	case "events.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT ` + dashboardBucketSQL() + ` AS time,
COALESCE(NULLIF(` + eventName + `, ''), NULLIF(body_text, ''), 'event') AS event_name,
COUNT(*) AS count FROM ` + table + ` WHERE ` + where + `
GROUP BY time, event_name ORDER BY time ASC, event_name ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "event_name", Type: "string"}, dashboardColumn{Key: "count", Type: "number"})

	case "user_prompt.detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + telemetryTextSQL("prompt", "gen_ai.input.messages") + ` AS prompt,
` + duration + ` AS cost_ms,
` + telemetryNumberSQL("prompt_length") + ` AS prompt_length,
` + telemetryResourceTextSQL("host.arch") + ` AS host_arch,
` + telemetryResourceTextSQL("os.type") + ` AS os_type,
` + telemetryResourceTextSQL("os.version") + ` AS os_version
FROM ` + table + ` WHERE ` + where + ` AND ` + promptCondition + `
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "prompt", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "prompt_length", Type: "number"},
			dashboardColumn{Key: "host_arch", Type: "string"},
			dashboardColumn{Key: "os_type", Type: "string"},
			dashboardColumn{Key: "os_version", Type: "string"},
		)

	case "models.summary":
		statement.SQL = `SELECT
` + model + ` AS model,
COUNT(*) AS request_count,
` + telemetrySumSQL(inputTokens) + ` AS input_tokens,
` + telemetrySumSQL(outputTokens) + ` AS output_tokens,
` + telemetrySumSQL(reasoningTokens) + ` AS reasoning_tokens,
COALESCE(AVG(NULLIF(` + duration + `, 0)), 0) AS avg_duration_ms,
COALESCE(SUM(CASE WHEN ` + telemetryNumberSQL("status_code", "http.response.status_code") + ` >= 400 THEN 1 ELSE 0 END), 0) AS error_count
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY model ORDER BY request_count DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "request_count", Type: "number"},
			dashboardColumn{Key: "input_tokens", Type: "number"}, dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "reasoning_tokens", Type: "number"}, dashboardColumn{Key: "avg_duration_ms", Type: "number"},
			dashboardColumn{Key: "error_count", Type: "number"},
		)

	case "models.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT ` + dashboardBucketSQL() + ` AS time,
` + eventName + ` AS event_name, COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY time, event_name ORDER BY time ASC, event_name ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "event_name", Type: "string"}, dashboardColumn{Key: "count", Type: "number"})

	case "models.latency_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT ` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model, COALESCE(AVG(NULLIF(` + duration + `, 0)), 0) AS value
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY time, model ORDER BY time ASC, model ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "value", Type: "number"})

	case "models.input_token_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		value := telemetrySumSQL(inputTokens)
		if profile.inputSeriesIncludesCache {
			value += " + " + telemetrySumSQL(cacheReadTokens)
		}
		statement.SQL = telemetryModelValueTimeseriesSQL(table, where, apiCondition, model, value)
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "value", Type: "number"})

	case "models.output_token_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = telemetryModelValueTimeseriesSQL(table, where, apiCondition, model, telemetrySumSQL(outputTokens))
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "value", Type: "number"})

	case "models.api_detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + model + ` AS model,
` + duration + ` AS cost_ms,
` + inputTokens + ` AS input_tokens,
` + cacheReadTokens + ` AS cache_read_tokens,
` + cacheCreationTokens + ` AS cache_creation_tokens,
` + outputTokens + ` AS output_tokens,
` + reasoningTokens + ` AS reasoning_tokens,
` + telemetryTextSQL("error.type") + ` AS error_type,
` + serviceName + ` AS service_name,
` + telemetryResourceTextSQL("host.arch") + ` AS host_arch,
` + telemetryResourceTextSQL("os.type") + ` AS os_type,
` + telemetryResourceTextSQL("os.version") + ` AS os_version
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"}, dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "input_tokens", Type: "number"}, dashboardColumn{Key: "cache_read_tokens", Type: "number"},
			dashboardColumn{Key: "cache_creation_tokens", Type: "number"}, dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "reasoning_tokens", Type: "number"}, dashboardColumn{Key: "error_type", Type: "string"},
			dashboardColumn{Key: "service_name", Type: "string"}, dashboardColumn{Key: "host_arch", Type: "string"},
			dashboardColumn{Key: "os_type", Type: "string"}, dashboardColumn{Key: "os_version", Type: "string"},
		)

	case "api.errors":
		status := telemetryNumberSQL("status_code", "http.response.status_code")
		statement.SQL = `SELECT COUNT(*) AS total_requests,
COALESCE(SUM(CASE WHEN ` + status + ` >= 400 THEN 1 ELSE 0 END), 0) AS error_requests,
COALESCE(SUM(CASE WHEN ` + status + ` >= 500 THEN 1 ELSE 0 END), 0) AS server_errors
FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_requests", "error_requests", "server_errors")

	case "tools.summary":
		statement.SQL = `SELECT
` + toolName + ` AS tool_name,
` + toolType + ` AS tool_type,
COUNT(*) AS invocation_count,
COALESCE(AVG(NULLIF(` + duration + `, 0)), 0) AS avg_duration_ms,
COALESCE(AVG(NULLIF(` + telemetryNumberSQL("tool_result_size_bytes", "result_size_bytes") + `, 0)), 0) AS avg_result_size
FROM ` + table + ` WHERE ` + where + ` AND ` + toolResultCondition + `
GROUP BY tool_name, tool_type ORDER BY invocation_count DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "tool_name", Type: "string"}, dashboardColumn{Key: "tool_type", Type: "string"},
			dashboardColumn{Key: "invocation_count", Type: "number"}, dashboardColumn{Key: "avg_duration_ms", Type: "number"},
			dashboardColumn{Key: "avg_result_size", Type: "number"},
		)

	case "tools.timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = telemetryToolTimeseriesSQL(table, where, toolTrendCondition, toolName, "tool_name")
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "tool_name", Type: "string"}, dashboardColumn{Key: "count", Type: "number"})

	case "tools.decision_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = telemetryToolTimeseriesSQL(table, where, toolTrendCondition, toolDecision, "decision")
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "decision", Type: "string"}, dashboardColumn{Key: "count", Type: "number"})

	case "tools.type_timeseries":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = telemetryToolTimeseriesSQL(table, where, toolTrendCondition, toolType, "tool_type")
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "tool_type", Type: "string"}, dashboardColumn{Key: "count", Type: "number"})

	case "tools.detail":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 100)
		statement.SQL = `SELECT
(timestamp DIV 1000000) AS time,
` + sessionID + ` AS session_id,
` + toolName + ` AS tool,
` + duration + ` AS cost_ms,
` + telemetryNumberSQL("tool_result_size_bytes", "result_size_bytes") + ` AS size,
` + toolDecision + ` AS decision,
` + toolType + ` AS tool_type,
` + telemetryResourceTextSQL("host.arch") + ` AS host_arch,
` + telemetryResourceTextSQL("os.type") + ` AS os_type,
` + telemetryResourceTextSQL("os.version") + ` AS os_version
FROM ` + table + ` WHERE ` + where + ` AND ` + toolResultCondition + `
ORDER BY timestamp DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"}, dashboardColumn{Key: "session_id", Type: "string"},
			dashboardColumn{Key: "tool", Type: "string"}, dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "size", Type: "number"}, dashboardColumn{Key: "decision", Type: "string"},
			dashboardColumn{Key: "tool_type", Type: "string"}, dashboardColumn{Key: "host_arch", Type: "string"},
			dashboardColumn{Key: "os_type", Type: "string"}, dashboardColumn{Key: "os_version", Type: "string"},
		)

	case "team.summary":
		statement.SQL = `SELECT
COUNT(DISTINCT NULLIF(` + username + `, '')) AS total_users,
` + telemetryTeamTokenSQL(profile, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) + ` AS total_tokens,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + apiCondition + ` THEN 1 ELSE 0 END), 0) AS request_count
FROM ` + table + ` WHERE ` + where
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = dashboardColumns("total_users", "total_tokens", "total_sessions", "request_count")

	case "team.member_ranking":
		limit := dashboardLimitDefault(request.Params, store.cfg.MaxLimit, 50)
		statement.SQL = `SELECT
` + username + ` AS username,
` + telemetryTeamTokenSQL(profile, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) + ` AS total_tokens,
COUNT(DISTINCT NULLIF(` + sessionID + `, '')) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + apiCondition + ` THEN 1 ELSE 0 END), 0) AS request_count
FROM ` + table + ` WHERE ` + where + ` AND ` + username + ` != ''
GROUP BY username ORDER BY total_tokens DESC LIMIT ?`
		statement.Args = append(cloneDashboardArgs(args), limit)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "username", Type: "string"}, dashboardColumn{Key: "total_tokens", Type: "number"},
			dashboardColumn{Key: "total_sessions", Type: "number"}, dashboardColumn{Key: "request_count", Type: "number"},
		)

	case "team.member_trend", "team.member_trend.users", "team.member_trend.tokens":
		step := dashboardStepMS(request.Params, request.To-request.From)
		statement.SQL = `SELECT ` + dashboardBucketSQL() + ` AS time,
COUNT(DISTINCT NULLIF(` + username + `, '')) AS active_users,
` + telemetryTeamTokenSQL(profile, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) + ` AS total_tokens
FROM ` + table + ` WHERE ` + where + ` GROUP BY time ORDER BY time ASC`
		statement.Args = prependDashboardStep(args, step)
		statement.Columns = timeSeriesColumns(dashboardColumn{Key: "active_users", Type: "number"}, dashboardColumn{Key: "total_tokens", Type: "number"})

	case "team.model_distribution":
		statement.SQL = `SELECT ` + model + ` AS model,
` + telemetryTeamTokenSQL(profile, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) + ` AS total_tokens,
COUNT(*) AS request_count FROM ` + table + ` WHERE ` + where + ` AND ` + apiCondition + `
GROUP BY model ORDER BY total_tokens DESC`
		statement.Args = cloneDashboardArgs(args)
		statement.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "model", Type: "string"}, dashboardColumn{Key: "total_tokens", Type: "number"},
			dashboardColumn{Key: "request_count", Type: "number"},
		)

	default:
		return dashboardStatement{}, false, nil
	}
	return statement, true, nil
}

func telemetryTextSQL(keys ...string) string {
	parts := make([]string, 0, len(keys)+1)
	for _, key := range keys {
		if strings.TrimSpace(key) != "" {
			parts = append(parts, "NULLIF("+logTextAttributeSQL(key)+", '')")
		}
	}
	if len(parts) == 0 {
		return "''"
	}
	parts = append(parts, "''")
	return "COALESCE(" + strings.Join(parts, ", ") + ")"
}

func telemetryResourceTextSQL(keys ...string) string {
	parts := make([]string, 0, len(keys)+1)
	for _, key := range keys {
		if strings.TrimSpace(key) != "" {
			parts = append(parts, `NULLIF(JSON_UNQUOTE(JSON_EXTRACT(resource_attributes, '$."`+key+`"')), '')`)
		}
	}
	if len(parts) == 0 {
		return "''"
	}
	parts = append(parts, "''")
	return "COALESCE(" + strings.Join(parts, ", ") + ")"
}

func telemetryNumberSQL(keys ...string) string {
	parts := make([]string, 0, len(keys)+1)
	for _, key := range keys {
		if strings.TrimSpace(key) != "" {
			parts = append(parts, `CAST(NULLIF(`+logTextAttributeSQL(key)+`, '') AS DECIMAL(38,9))`)
		}
	}
	if len(parts) == 0 {
		return "0"
	}
	parts = append(parts, "0")
	return "COALESCE(" + strings.Join(parts, ", ") + ")"
}

func telemetrySessionIDSQL(profile telemetryDashboardProfile) string {
	parts := []string{"NULLIF(session_id, '')"}
	for _, key := range profile.sessionKeys {
		parts = append(parts, "NULLIF("+logTextAttributeSQL(key)+", '')")
	}
	parts = append(parts, "''")
	return "COALESCE(" + strings.Join(parts, ", ") + ")"
}

func telemetryServiceNameSQL(profile telemetryDashboardProfile) string {
	parts := []string{"NULLIF(service_name, '')"}
	for _, key := range profile.serviceKeys {
		parts = append(parts, "NULLIF("+logTextAttributeSQL(key)+", '')")
		parts = append(parts, `NULLIF(JSON_UNQUOTE(JSON_EXTRACT(resource_attributes, '$."`+key+`"')), '')`)
	}
	parts = append(parts, "''")
	return "COALESCE(" + strings.Join(parts, ", ") + ")"
}

func telemetryUsernameSQL() string {
	return `COALESCE(NULLIF(user_id, ''), NULLIF(` + logTextAttributeSQL("ant.username") + `, ''), NULLIF(` + logTextAttributeSQL("user.id") + `, ''), '')`
}

func telemetryEventCondition(eventExpression, eventValue, bodyValue string) string {
	conditions := make([]string, 0, 2)
	if eventValue != "" {
		conditions = append(conditions, eventExpression+" = '"+telemetrySQLLiteral(eventValue)+"'")
	}
	if bodyValue != "" {
		conditions = append(conditions, "body_text = '"+telemetrySQLLiteral(bodyValue)+"'")
	}
	if len(conditions) == 0 {
		return "FALSE"
	}
	return "(" + strings.Join(conditions, " OR ") + ")"
}

func telemetrySQLLiteral(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func telemetrySumSQL(value string) string {
	return "COALESCE(SUM(" + value + "), 0)"
}

func telemetryModelValueTimeseriesSQL(table, where, condition, model, value string) string {
	return `SELECT ` + dashboardBucketSQL() + ` AS time,
` + model + ` AS model, ` + value + ` AS value
FROM ` + table + ` WHERE ` + where + ` AND ` + condition + `
GROUP BY time, model ORDER BY time ASC, model ASC`
}

func telemetryToolTimeseriesSQL(table, where, condition, dimension, alias string) string {
	return `SELECT ` + dashboardBucketSQL() + ` AS time,
` + dimension + ` AS ` + alias + `, COUNT(*) AS count
FROM ` + table + ` WHERE ` + where + ` AND ` + condition + ` AND ` + dimension + ` != ''
GROUP BY time, ` + alias + ` ORDER BY time ASC, ` + alias + ` ASC`
}

func telemetryTeamTokenSQL(profile telemetryDashboardProfile, input, output, cacheRead, cacheCreation string) string {
	value := telemetrySumSQL(input) + " + " + telemetrySumSQL(output)
	if profile.teamTotalIncludesCache {
		value += " + " + telemetrySumSQL(cacheRead) + " + " + telemetrySumSQL(cacheCreation)
	}
	return value
}
