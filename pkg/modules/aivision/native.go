package aivision

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
)

type nativeListParams struct {
	From         int64
	To           int64
	User         string
	SpaceID      string
	AgentProduct string
	TraceID      string
	TraceIDs     []string
	SessionID    string
	SessionIDs   []string
	SpanIDs      []string
	Page         int
	Limit        int
	Fields       []string
	Filters      []nativeFilter
	OrderBy      string
	SearchType   string
	Keyword      string
	InputKeyword string
	Tags         []string
	Env          string
	Scene        string
	Username     string
	IncludeSpans bool
}

const nativeSpanProjection = `trace_id,
	span_id,
	parent_span_id,
	span_name AS name,
	span_kind AS kind,
	status_code,
	status_message,
	start_time_unix_nano,
	end_time_unix_nano,
	duration_nano,
	service_name,
	user_id,
	space_id,
	agent_product,
	session_id,
	resource_attributes,
	attributes,
	events,
	links,
	payload`

func (store *oceanBaseStore) listTraces(ctx context.Context, orgID string, params nativeListParams) (nativeTraceListResponse, error) {
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeTraceListResponse{}, err
	}
	countSQL := "SELECT COUNT(*) AS total_items FROM (SELECT trace_id FROM " + store.tracesTable() + " WHERE " + where + " GROUP BY trace_id) AS matching_traces"
	countRows, err := store.queryRows(ctx, countSQL, args...)
	if err != nil {
		return nativeTraceListResponse{}, err
	}
	total, err := firstInt(countRows, "total_items")
	if err != nil {
		return nativeTraceListResponse{}, err
	}

	offset := (params.Page - 1) * params.Limit
	query := `SELECT
	trace_id,
	MIN(start_time_unix_nano) AS start_time_unix_nano,
	MAX(end_time_unix_nano) AS end_time_unix_nano,
	COUNT(*) AS span_count,
	COALESCE(MAX(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN span_name END), MIN(span_name)) AS name,
	COALESCE(MAX(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN service_name END), MAX(service_name)) AS service_name,
	CASE WHEN COALESCE(SUM(CASE WHEN status_code = 2 THEN 1 ELSE 0 END), 0) > 0 THEN 2 ELSE MAX(status_code) END AS status_code,
	MAX(user_id) AS user_id,
	MAX(space_id) AS space_id,
	MAX(agent_product) AS agent_product,
	MAX(session_id) AS session_id,
	` + rootPreferredSQL("COALESCE(NULLIF("+traceAttributeTextSQL("gen_ai.span.kind")+", ''), NULLIF(span_kind, ''))") + ` AS ` + quoteIdentifier("attributes.gen_ai.span.kind") + `,
	` + rootPreferredSQL("COALESCE(NULLIF("+traceAttributeTextSQL("gen_ai.request.model")+", ''), NULLIF("+traceAttributeTextSQL("gen_ai.response.model")+", ''))") + ` AS ` + quoteIdentifier("attributes.gen_ai.request.model") + `,
	` + rootPreferredSQL(traceTagsSQL()) + ` AS ` + quoteIdentifier("attributes.langfuse.trace.tags") + `,
	` + rootPreferredSQL(traceEnvSQL()) + ` AS ` + quoteIdentifier("resource.attributes.ant.agent.env") + `,
	` + rootPreferredSQL(traceSceneSQL()) + ` AS ` + quoteIdentifier("resource.attributes.ant.agent.scene") + `,
	` + rootPreferredSQL(traceUsernameSQL()) + ` AS ` + quoteIdentifier("attributes.ant.username") + `,
		` + inputTokenSumSQL() + ` AS input_tokens,
		` + outputTokenSumSQL() + ` AS output_tokens,
		` + totalTokenSumSQL() + ` AS total_tokens,
	COALESCE(SUM(CASE WHEN status_code = 2 THEN 1 ELSE 0 END), 0) AS error_count
	FROM ` + store.tracesTable() + ` WHERE ` + where + `
	GROUP BY trace_id ORDER BY ` + nativeTraceOrderBy(params.OrderBy) + ` LIMIT ? OFFSET ?`
	queryArgs := append(append([]any{}, args...), params.Limit, offset)
	rows, err := store.queryRows(ctx, query, queryArgs...)
	if err != nil {
		return nativeTraceListResponse{}, err
	}
	for _, row := range rows {
		normalizeNativeTimestamp(row, "start_time_unix_nano")
		normalizeNativeTimestamp(row, "end_time_unix_nano")
		row["period"] = row["start_time_unix_nano"]
	}
	return nativeTraceListResponse{Data: rows, Meta: buildPageMeta(params.Page, params.Limit, int(total))}, nil
}

func (store *oceanBaseStore) getTraceDetail(ctx context.Context, orgID, traceID string, params nativeListParams) (nativeTraceDetailResponse, error) {
	if strings.TrimSpace(traceID) == "" || len(traceID) > 255 {
		return nativeTraceDetailResponse{}, fmt.Errorf("invalid traceID")
	}
	params.TraceID = traceID
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeTraceDetailResponse{}, err
	}
	query := `SELECT ` + nativeSpanProjection + `
	FROM ` + store.tracesTable() + ` WHERE ` + where + ` ORDER BY timestamp ASC`
	rows, err := store.queryRows(ctx, query, args...)
	if err != nil {
		return nativeTraceDetailResponse{}, err
	}
	if len(rows) == 0 {
		return nativeTraceDetailResponse{}, errNotFound
	}
	var sessionID any
	for _, row := range rows {
		if sessionID == nil && row["session_id"] != nil && fmt.Sprint(row["session_id"]) != "" {
			sessionID = row["session_id"]
		}
		if resource, ok := row["resource_attributes"]; ok {
			row["resource"] = resource
		}
		normalizeNativeSpan(row)
	}
	return nativeTraceDetailResponse{TraceID: traceID, SessionID: sessionID, Spans: rows}, nil
}

func (store *oceanBaseStore) listSessions(ctx context.Context, orgID string, params nativeListParams) (nativeSessionListResponse, error) {
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeSessionListResponse{}, err
	}
	where += " AND session_id IS NOT NULL AND session_id != ''"
	countQuery := "SELECT COUNT(DISTINCT session_id) AS total_items FROM " + store.tracesTable() + " WHERE " + where
	countRows, err := store.queryRows(ctx, countQuery, args...)
	if err != nil {
		return nativeSessionListResponse{}, err
	}
	total, err := firstInt(countRows, "total_items")
	if err != nil {
		return nativeSessionListResponse{}, err
	}
	offset := (params.Page - 1) * params.Limit
	query := `SELECT
	session_id,
	MIN(start_time_unix_nano) AS start_time_unix_nano,
	MAX(end_time_unix_nano) AS end_time_unix_nano,
	COUNT(DISTINCT trace_id) AS trace_count,
	COUNT(*) AS span_count,
	MAX(user_id) AS user_id,
	MAX(space_id) AS space_id,
	MAX(agent_product) AS agent_product,
	MAX(` + traceEnvSQL() + `) AS environment,
	MAX(` + traceSceneSQL() + `) AS scene,
	MAX(` + traceUsernameSQL() + `) AS username,
		` + inputTokenSumSQL() + ` AS input_tokens,
		` + outputTokenSumSQL() + ` AS output_tokens,
		` + totalTokenSumSQL() + ` AS total_tokens
	FROM ` + store.tracesTable() + ` WHERE ` + where + `
	GROUP BY session_id ORDER BY ` + nativeSessionOrderBy(params.OrderBy) + ` LIMIT ? OFFSET ?`
	queryArgs := append(append([]any{}, args...), params.Limit, offset)
	rows, err := store.queryRows(ctx, query, queryArgs...)
	if err != nil {
		return nativeSessionListResponse{}, err
	}
	for _, row := range rows {
		if start, conversionErr := asInt64(row["start_time_unix_nano"]); conversionErr == nil {
			row["created_at"] = time.Unix(0, start).UTC().Format(time.RFC3339Nano)
		}
		if end, conversionErr := asInt64(row["end_time_unix_nano"]); conversionErr == nil {
			row["last_activity"] = time.Unix(0, end).UTC().Format(time.RFC3339Nano)
		}
		normalizeNativeTimestamp(row, "start_time_unix_nano")
		normalizeNativeTimestamp(row, "end_time_unix_nano")
		if scene := strings.TrimSpace(fmt.Sprint(row["scene"])); scene != "" && scene != "<nil>" {
			row["scenes"] = []string{scene}
		} else {
			row["scenes"] = []string{}
		}
	}
	facets, err := store.nativeSessionFacets(ctx, orgID, params)
	if err != nil {
		return nativeSessionListResponse{}, err
	}
	return nativeSessionListResponse{Data: rows, Meta: buildPageMeta(params.Page, params.Limit, int(total)), Facets: facets}, nil
}

func normalizeNativeTimestamp(row map[string]any, key string) {
	nano, err := asInt64(row[key])
	if err != nil || nano <= 0 {
		return
	}
	row[key] = time.Unix(0, nano).UTC().Format(time.RFC3339Nano)
}

func normalizeNativeSpan(row map[string]any) {
	normalizeNativeTimestamp(row, "start_time_unix_nano")
	normalizeNativeTimestamp(row, "end_time_unix_nano")

	code, _ := asInt64(row["status_code"])
	statusName := "UNSET"
	switch code {
	case 1:
		statusName = "OK"
	case 2:
		statusName = "ERROR"
	}
	row["status"] = map[string]any{
		"code":    statusName,
		"message": fmt.Sprint(row["status_message"]),
	}
	delete(row, "status_code")
	delete(row, "status_message")

	kind := strings.ToLower(strings.TrimSpace(fmt.Sprint(row["kind"])))
	if numeric, ok := map[string]string{
		"unspecified": "0",
		"internal":    "1",
		"server":      "2",
		"client":      "3",
		"producer":    "4",
		"consumer":    "5",
	}[kind]; ok {
		row["kind"] = numeric
	}

	events, ok := row["events"].([]any)
	if !ok {
		return
	}
	for _, event := range events {
		item, ok := event.(map[string]any)
		if !ok {
			continue
		}
		if timestamp, exists := item["timestamp_unix_nano"]; exists {
			if nano, err := asInt64(timestamp); err == nil && nano > 0 {
				item["time_unix_nano"] = time.Unix(0, nano).UTC().Format(time.RFC3339Nano)
			}
			delete(item, "timestamp_unix_nano")
		}
	}
}

func (store *oceanBaseStore) getSessionDetail(ctx context.Context, orgID, sessionID string, params nativeListParams) (nativeSessionDetailResponse, error) {
	if strings.TrimSpace(sessionID) == "" || len(sessionID) > 255 {
		return nativeSessionDetailResponse{}, fmt.Errorf("invalid sessionID")
	}
	params.SessionID = sessionID
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeSessionDetailResponse{}, err
	}
	query := `SELECT trace_id, MIN(start_time_unix_nano) AS start_nano, MAX(end_time_unix_nano) AS end_nano
FROM ` + store.tracesTable() + ` WHERE ` + where + ` GROUP BY trace_id ORDER BY start_nano ASC`
	rows, err := store.queryRows(ctx, query, args...)
	if err != nil {
		return nativeSessionDetailResponse{}, err
	}
	if len(rows) == 0 {
		return nativeSessionDetailResponse{}, errNotFound
	}
	traceIDs := make([]string, 0, len(rows))
	startNano := int64(math.MaxInt64)
	var endNano int64
	for _, row := range rows {
		traceIDs = append(traceIDs, fmt.Sprint(row["trace_id"]))
		if value, conversionErr := asInt64(row["start_nano"]); conversionErr == nil && value < startNano {
			startNano = value
		}
		if value, conversionErr := asInt64(row["end_nano"]); conversionErr == nil && value > endNano {
			endNano = value
		}
	}
	response := nativeSessionDetailResponse{
		SessionID: sessionID, TraceCount: len(traceIDs), TraceIDs: traceIDs,
		TimeRange: map[string]any{"from": time.Unix(0, startNano).UTC().Format(time.RFC3339Nano), "to": time.Unix(0, endNano).UTC().Format(time.RFC3339Nano)},
	}
	if params.IncludeSpans {
		spanParams := params
		spanParams.TraceID = ""
		spanParams.TraceIDs = traceIDs
		spanWhere, spanArgs, spanErr := nativeTraceWhere(orgID, spanParams)
		if spanErr != nil {
			return nativeSessionDetailResponse{}, spanErr
		}
		spanRows, spanErr := store.queryRows(
			ctx,
			"SELECT "+nativeSpanProjection+" FROM "+store.tracesTable()+" WHERE "+spanWhere+" ORDER BY timestamp ASC",
			spanArgs...,
		)
		if spanErr != nil {
			return nativeSessionDetailResponse{}, spanErr
		}
		for _, row := range spanRows {
			if resource, ok := row["resource_attributes"]; ok {
				row["resource"] = resource
			}
			normalizeNativeSpan(row)
		}
		response.Spans = spanRows
	}
	return response, nil
}

func (store *oceanBaseStore) dashboardQuery(ctx context.Context, orgID string, request dashboardRequest) (dashboardResponse, error) {
	if err := validateRange(request.From, request.To, store.cfg.MaxQueryRange); err != nil {
		return dashboardResponse{}, err
	}
	whereSQL, args, err := dashboardWhere(orgID, request)
	if err != nil {
		return dashboardResponse{}, err
	}

	response := dashboardResponse{QueryKey: request.QueryKey, Rows: []map[string]any{}, Meta: map[string]any{"from": request.From, "to": request.To}}
	switch request.QueryKey {
	case "codex.dashboard.summary":
		query := `SELECT
` + logTokenSumSQL("input_token_count") + ` AS input_tokens,
` + logTokenSumSQL("output_token_count") + ` AS output_tokens,
` + logTokenSumSQL("cached_token_count") + ` AS cache_read_tokens,
COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), NULLIF(` + logTextAttributeSQL("conversation.id") + `, ''))) AS total_sessions,
COALESCE(SUM(CASE WHEN ` + codexAPIRequestSQL() + ` THEN 1 ELSE 0 END), 0) AS request_count,
SUM(` + logNumberAttributeSQL("duration_ms") + `) AS active_time_ms
FROM ` + store.logsTable() + ` WHERE ` + whereSQL
		rows, err := store.queryRows(ctx, query, args...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = dashboardColumns("input_tokens", "output_tokens", "cache_read_tokens", "total_sessions", "request_count", "active_time_ms")
		response.Rows = rows
		return response, nil
	case "codex.overview.event_stream":
		limit := dashboardLimit(request.Params, store.cfg.MaxLimit)
		query := `SELECT
(timestamp DIV 1000000) AS time,
COALESCE(NULLIF(event_name, ''), NULLIF(` + logTextAttributeSQL("event.name") + `, ''), 'event') AS event,
` + logNumberAttributeSQL("duration_ms") + ` AS cost_ms,
COALESCE(NULLIF(` + logTextAttributeSQL("model") + `, ''), NULLIF(` + logTextAttributeSQL("gen_ai.request.model") + `, ''), '') AS model,
` + logNumberAttributeSQL("input_token_count") + ` AS input_tokens,
` + logNumberAttributeSQL("cached_token_count") + ` AS cache_read_tokens,
` + logNumberAttributeSQL("output_token_count") + ` AS output_tokens
FROM ` + store.logsTable() + ` WHERE ` + whereSQL + ` ORDER BY timestamp DESC LIMIT ?`
		queryArgs := append(append([]any{}, args...), limit)
		rows, err := store.queryRows(ctx, query, queryArgs...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "event", Type: "string"},
			dashboardColumn{Key: "cost_ms", Type: "number"},
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "cache_read_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
		)
		response.Rows = rows
		return response, nil
	case "codex.tokens.timeseries":
		stepMS := dashboardStepMS(request.Params, request.To-request.From)
		queryArgs := append([]any{stepMS, stepMS}, args...)
		query := `SELECT
(((timestamp DIV 1000000) DIV ?) * ?) AS time,
` + logTokenSumSQL("input_token_count") + ` AS input_tokens,
` + logTokenSumSQL("output_token_count") + ` AS output_tokens,
` + logTokenSumSQL("cached_token_count") + ` AS cache_read_tokens
FROM ` + store.logsTable() + ` WHERE ` + whereSQL + ` GROUP BY time ORDER BY time ASC`
		rows, err := store.queryRows(ctx, query, queryArgs...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "input_tokens", Type: "number"},
			dashboardColumn{Key: "output_tokens", Type: "number"},
			dashboardColumn{Key: "cache_read_tokens", Type: "number"},
		)
		response.Rows = rows
		return response, nil
	case "codex.overview.token_by_model":
		stepMS := dashboardStepMS(request.Params, request.To-request.From)
		modelSQL := `COALESCE(NULLIF(` + logTextAttributeSQL("model") + `, ''), NULLIF(` + logTextAttributeSQL("gen_ai.request.model") + `, ''), 'unknown')`
		queryArgs := append([]any{stepMS, stepMS}, args...)
		query := `SELECT
(((timestamp DIV 1000000) DIV ?) * ?) AS time,
` + modelSQL + ` AS model,
SUM(` + logNumberAttributeSQL("input_token_count") + ` + ` + logNumberAttributeSQL("output_token_count") + `) AS value
FROM ` + store.logsTable() + ` WHERE ` + whereSQL + ` GROUP BY time, model ORDER BY time ASC, model ASC`
		rows, err := store.queryRows(ctx, query, queryArgs...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = mixedDashboardColumns(
			dashboardColumn{Key: "time", Type: "timestamp"},
			dashboardColumn{Key: "model", Type: "string"},
			dashboardColumn{Key: "value", Type: "number"},
		)
		response.Rows = rows
		return response, nil
	case "codex.telemetry.metrics", "telemetry.metrics.timeseries":
		return store.metricDashboard(ctx, orgID, request)
	case "telemetry.traces.timeseries":
		return store.dashboardCountTimeseries(ctx, response, store.tracesTable(), whereSQL, args, request, "COUNT(DISTINCT trace_id)")
	case "telemetry.logs.timeseries":
		return store.dashboardCountTimeseries(ctx, response, store.logsTable(), whereSQL, args, request, "COUNT(*)")
	case "telemetry.tokens.timeseries":
		return store.dashboardCountTimeseries(ctx, response, store.tracesTable(), whereSQL, args, request, totalTokenSumSQL())
	case "telemetry.traces.summary":
		query := `SELECT COUNT(DISTINCT trace_id) AS trace_count,
COUNT(*) AS span_count,
COALESCE(SUM(CASE WHEN status_code = 2 THEN 1 ELSE 0 END), 0) AS error_count,
AVG(duration_nano) / 1000000 AS avg_duration_ms
FROM ` + store.tracesTable() + ` WHERE ` + whereSQL
		rows, err := store.queryRows(ctx, query, args...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = dashboardColumns("trace_count", "span_count", "error_count", "avg_duration_ms")
		response.Rows = rows
		return response, nil
	case "telemetry.tokens.summary":
		query := `SELECT ` + inputTokenSumSQL() + ` AS input_tokens,
` + outputTokenSumSQL() + ` AS output_tokens,
` + totalTokenSumSQL() + ` AS total_tokens
FROM ` + store.tracesTable() + ` WHERE ` + whereSQL
		rows, err := store.queryRows(ctx, query, args...)
		if err != nil {
			return dashboardResponse{}, err
		}
		response.Columns = dashboardColumns("input_tokens", "output_tokens", "total_tokens")
		response.Rows = rows
		return response, nil
	default:
		statement, handled, err := buildCodexDashboardStatement(store, request, whereSQL, args)
		if err != nil {
			return dashboardResponse{}, err
		}
		if !handled {
			statement, handled, err = buildTelemetryDashboardStatement(store, request, whereSQL, args)
			if err != nil {
				return dashboardResponse{}, err
			}
		}
		if handled {
			rows, err := store.queryRows(ctx, statement.SQL, statement.Args...)
			if err != nil {
				return dashboardResponse{}, err
			}
			response.Columns = statement.Columns
			response.Rows = rows
			return response, nil
		}
		return dashboardResponse{}, fmt.Errorf("unsupported queryKey %q", request.QueryKey)
	}
}

func dashboardWhere(orgID string, request dashboardRequest) (string, []any, error) {
	spaceID := strings.TrimSpace(request.SpaceID)
	if spaceID == "" || len(spaceID) > 255 {
		return "", nil, fmt.Errorf("invalid space_id")
	}
	where := []string{"org_id = ?", "timestamp >= ?", "timestamp < ?"}
	args := []any{orgID, request.From * int64(time.Millisecond), request.To * int64(time.Millisecond)}
	where = append(where, "space_id = ?")
	args = append(args, spaceID)
	if request.User != "" {
		where = append(where, "user_id = ?")
		args = append(args, request.User)
	}
	if request.AgentProduct != "" {
		where = append(where, "agent_product = ?")
		args = append(args, request.AgentProduct)
	}
	return strings.Join(where, " AND "), args, nil
}

func (store *oceanBaseStore) dashboardCountTimeseries(ctx context.Context, response dashboardResponse, table, where string, args []any, request dashboardRequest, aggregate string) (dashboardResponse, error) {
	stepMS := dashboardStepMS(request.Params, request.To-request.From)
	queryArgs := append([]any{stepMS, stepMS}, args...)
	query := "SELECT (((timestamp DIV 1000000) DIV ?) * ?) AS time, " + aggregate + " AS value FROM " + table + " WHERE " + where + " GROUP BY time ORDER BY time ASC"
	rows, err := store.queryRows(ctx, query, queryArgs...)
	if err != nil {
		return dashboardResponse{}, err
	}
	response.Columns = metricDashboardColumns()
	response.Rows = rows
	return response, nil
}

func nativeTraceWhere(orgID string, params nativeListParams) (string, []any, error) {
	return nativeTraceWhereExcluding(orgID, params, "")
}

func nativeTraceWhereExcluding(orgID string, params nativeListParams, excludedDimension string) (string, []any, error) {
	if err := validateRange(params.From, params.To, 31*24*time.Hour); err != nil {
		return "", nil, err
	}
	if strings.TrimSpace(params.SpaceID) == "" {
		return "", nil, fmt.Errorf("space_id is required")
	}
	for name, value := range map[string]string{
		"user": params.User, "space_id": params.SpaceID, "agent_product": params.AgentProduct,
		"trace_id": params.TraceID, "session_id": params.SessionID,
	} {
		if len(value) > 255 {
			return "", nil, fmt.Errorf("invalid %s", name)
		}
	}
	where := []string{"org_id = ?", "timestamp >= ?", "timestamp < ?"}
	args := []any{orgID, params.From * int64(time.Millisecond), params.To * int64(time.Millisecond)}
	appendEqual := func(column, value string) {
		if value == "" {
			return
		}
		where = append(where, column+" = ?")
		args = append(args, value)
	}
	appendEqual("user_id", params.User)
	appendEqual("space_id", params.SpaceID)
	appendEqual("agent_product", params.AgentProduct)
	appendEqual("trace_id", params.TraceID)
	appendEqual("session_id", params.SessionID)

	for _, pair := range []struct {
		column string
		values []string
	}{
		{"trace_id", params.TraceIDs},
		{"session_id", params.SessionIDs},
		{"span_id", params.SpanIDs},
	} {
		clause, values, err := nativeStringListClause(pair.column, pair.values)
		if err != nil {
			return "", nil, err
		}
		if clause != "" {
			where = append(where, clause)
			args = append(args, values...)
		}
	}

	if len(params.Filters) > 100 {
		return "", nil, fmt.Errorf("filters supports at most 100 items")
	}
	for index, filter := range params.Filters {
		if nativeFilterDimension(filter.Field) == excludedDimension {
			continue
		}
		clause, values, err := compileNativeFilter(filter)
		if err != nil {
			return "", nil, fmt.Errorf("filter %d: %w", index, err)
		}
		where = append(where, clause)
		args = append(args, values...)
	}

	for _, direct := range []struct {
		dimension  string
		expression string
		value      string
	}{
		{"env", traceEnvSQL(), params.Env},
		{"scene", traceSceneSQL(), params.Scene},
		{"username", traceUsernameSQL(), params.Username},
	} {
		if direct.dimension == excludedDimension || strings.TrimSpace(direct.value) == "" {
			continue
		}
		where = append(where, direct.expression+" = ?")
		args = append(args, strings.TrimSpace(direct.value))
	}
	if excludedDimension != "tags" && len(params.Tags) > 0 {
		clause, values, err := nativeTagsClause(params.Tags)
		if err != nil {
			return "", nil, err
		}
		where = append(where, clause)
		args = append(args, values...)
	}

	keyword := strings.TrimSpace(params.Keyword)
	searchType := strings.TrimSpace(params.SearchType)
	if keyword != "" {
		if len(keyword) > 4096 {
			return "", nil, fmt.Errorf("keyword is too long")
		}
		switch searchType {
		case "", "traceId", "trace_id":
			where = append(where, "trace_id = ?")
			args = append(args, keyword)
		case "input":
			where = append(where, traceInputSQL()+" LIKE ?")
			args = append(args, "%"+keyword+"%")
		case "output":
			where = append(where, traceOutputSQL()+" LIKE ?")
			args = append(args, "%"+keyword+"%")
		default:
			return "", nil, fmt.Errorf("unsupported searchType %q", searchType)
		}
	}
	if fuzzy := strings.TrimSpace(params.InputKeyword); fuzzy != "" {
		if len(fuzzy) > 4096 {
			return "", nil, fmt.Errorf("input_keyword is too long")
		}
		where = append(where, "("+traceInputSQL()+" LIKE ? OR "+traceOutputSQL()+" LIKE ?)")
		args = append(args, "%"+fuzzy+"%", "%"+fuzzy+"%")
	}
	return strings.Join(where, " AND "), args, nil
}

func nativeStringListClause(column string, rawValues []string) (string, []any, error) {
	values := uniqueNativeIDs(rawValues)
	if len(values) == 0 {
		return "", nil, nil
	}
	if len(values) > 200 {
		return "", nil, fmt.Errorf("%s list supports at most 200 items", column)
	}
	args := make([]any, 0, len(values))
	for _, value := range values {
		if len(value) > 255 {
			return "", nil, fmt.Errorf("invalid %s", column)
		}
		args = append(args, value)
	}
	return column + " IN (" + placeholders(len(args)) + ")", args, nil
}

func uniqueNativeIDs(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, raw := range values {
		value := strings.TrimSpace(raw)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func placeholders(count int) string {
	return strings.TrimSuffix(strings.Repeat("?,", count), ",")
}

func compileNativeFilter(filter nativeFilter) (string, []any, error) {
	field := strings.TrimSpace(filter.Field)
	expression, ok := nativeFilterExpression(field)
	if !ok {
		return "", nil, fmt.Errorf("unsupported field %q", field)
	}
	op := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(filter.Op), "_", " "))
	if op == "" || op == "EQ" {
		op = "="
	}
	if nativeFilterDimension(field) == "tags" {
		switch op {
		case "=", "IN":
			return nativeTagsClause(nativeFilterStrings(filter.Value))
		default:
			return "", nil, fmt.Errorf("unsupported tags operator %q", filter.Op)
		}
	}
	switch op {
	case "IN", "NOT IN":
		values := nativeFilterValues(filter.Value)
		if len(values) == 0 || len(values) > 200 {
			return "", nil, fmt.Errorf("%s requires 1 to 200 values", op)
		}
		return expression + " " + op + " (" + placeholders(len(values)) + ")", values, nil
	case "=", "!=", ">=", "<=", ">", "<":
		if isNativeListValue(filter.Value) {
			return "", nil, fmt.Errorf("%s requires a scalar value", op)
		}
		return expression + " " + op + " ?", []any{filter.Value}, nil
	case "LIKE", "CONTAINS":
		value, ok := filter.Value.(string)
		if !ok || strings.TrimSpace(value) == "" {
			return "", nil, fmt.Errorf("%s requires a non-empty string", op)
		}
		return expression + " LIKE ?", []any{"%" + value + "%"}, nil
	case "IS NULL", "IS NOT NULL":
		return expression + " " + op, nil, nil
	default:
		return "", nil, fmt.Errorf("unsupported operator %q", filter.Op)
	}
}

func nativeFilterExpression(field string) (string, bool) {
	expressions := map[string]string{
		"trace_id": "trace_id", "span_id": "span_id", "session_id": "session_id",
		"attributes.gen_ai.conversation.id": "session_id",
		"name":                              "span_name", "status_code": "status_code", "agent_product": "agent_product",
		"attributes.ant.username": traceUsernameSQL(), "username": traceUsernameSQL(),
		"resource.attributes.ant.agent.env": traceEnvSQL(), "env": traceEnvSQL(),
		"resource.attributes.ant.agent.scene": traceSceneSQL(), "scene": traceSceneSQL(),
		"attributes.langfuse.trace.tags": traceTagsSQL(), "tags": traceTagsSQL(),
		"attributes.gen_ai.request.model": traceModelSQL(), "model": traceModelSQL(),
		"start_time_unix_nano": "start_time_unix_nano", "end_time_unix_nano": "end_time_unix_nano",
	}
	expression, ok := expressions[field]
	return expression, ok
}

func nativeFilterDimension(field string) string {
	switch field {
	case "resource.attributes.ant.agent.env", "env":
		return "env"
	case "resource.attributes.ant.agent.scene", "scene":
		return "scene"
	case "attributes.ant.username", "username":
		return "username"
	case "attributes.langfuse.trace.tags", "tags":
		return "tags"
	default:
		return ""
	}
}

func nativeFilterValues(value any) []any {
	switch typed := value.(type) {
	case []any:
		return typed
	case []string:
		result := make([]any, len(typed))
		for index := range typed {
			result[index] = typed[index]
		}
		return result
	default:
		return nil
	}
}

func nativeFilterStrings(value any) []string {
	values := nativeFilterValues(value)
	if values == nil {
		values = []any{value}
	}
	result := make([]string, 0, len(values))
	for _, item := range values {
		if text := strings.TrimSpace(fmt.Sprint(item)); text != "" && text != "<nil>" {
			result = append(result, text)
		}
	}
	return result
}

func isNativeListValue(value any) bool {
	switch value.(type) {
	case []any, []string:
		return true
	default:
		return false
	}
}

func nativeTagsClause(rawTags []string) (string, []any, error) {
	tags := uniqueNativeIDs(rawTags)
	if len(tags) == 0 || len(tags) > 100 {
		return "", nil, fmt.Errorf("tags requires 1 to 100 values")
	}
	clauses := make([]string, 0, len(tags))
	args := make([]any, 0, len(tags))
	for _, tag := range tags {
		if len(tag) > 255 {
			return "", nil, fmt.Errorf("invalid tag")
		}
		// Tags are stored as a JSON array string. Match a quoted array item and
		// escape LIKE metacharacters so a user-supplied tag stays an exact value.
		escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(tag)
		clauses = append(clauses, traceTagsSQL()+` LIKE ? ESCAPE '\\'`)
		args = append(args, `%"`+escaped+`"%`)
	}
	return "(" + strings.Join(clauses, " OR ") + ")", args, nil
}

func nativeTraceOrderBy(raw string) string {
	field, direction := parseNativeOrder(raw, "start_time_unix_nano", "DESC")
	allowed := map[string]string{
		"timestamp": "start_time_unix_nano", "period": "start_time_unix_nano",
		"start_time_unix_nano": "start_time_unix_nano", "end_time_unix_nano": "end_time_unix_nano",
		"name": "name", "trace_id": "trace_id", "status_code": "status_code",
	}
	if mapped, ok := allowed[field]; ok {
		return mapped + " " + direction
	}
	return "start_time_unix_nano DESC"
}

func nativeSessionOrderBy(raw string) string {
	field, direction := parseNativeOrder(raw, "end_time_unix_nano", "DESC")
	allowed := map[string]string{
		"last_activity": "end_time_unix_nano", "end_time_unix_nano": "end_time_unix_nano",
		"created_at": "start_time_unix_nano", "start_time_unix_nano": "start_time_unix_nano",
		"session_id": "session_id", "trace_count": "trace_count",
	}
	if mapped, ok := allowed[field]; ok {
		return mapped + " " + direction
	}
	return "end_time_unix_nano DESC"
}

func parseNativeOrder(raw, defaultField, defaultDirection string) (string, string) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return defaultField, defaultDirection
	}
	parts := strings.Split(value, ".")
	direction := defaultDirection
	if len(parts) > 1 {
		candidate := strings.ToUpper(parts[len(parts)-1])
		if candidate == "ASC" || candidate == "DESC" {
			direction = candidate
			parts = parts[:len(parts)-1]
		}
	}
	return strings.Join(parts, "."), direction
}

func quoteIdentifier(value string) string {
	return "`" + strings.ReplaceAll(value, "`", "``") + "`"
}

func rootPreferredSQL(expression string) string {
	return "COALESCE(MAX(CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN " + expression + " END), MAX(" + expression + "))"
}

func traceAttributeTextSQL(key string) string {
	return `JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."` + key + `"'))`
}

func traceResourceTextSQL(key string) string {
	return `JSON_UNQUOTE(JSON_EXTRACT(resource_attributes, '$."` + key + `"'))`
}

func traceEnvSQL() string {
	return "COALESCE(NULLIF(" + traceResourceTextSQL("ant.agent.env") + ", ''), NULLIF(" + traceResourceTextSQL("deployment.environment") + ", ''), NULLIF(" + traceAttributeTextSQL("ant.agent.env") + ", ''))"
}

func traceSceneSQL() string {
	return "COALESCE(NULLIF(" + traceResourceTextSQL("ant.agent.scene") + ", ''), NULLIF(" + traceAttributeTextSQL("ant.scene") + ", ''), NULLIF(" + traceAttributeTextSQL("scene") + ", ''))"
}

func traceUsernameSQL() string {
	return "COALESCE(NULLIF(user_id, ''), NULLIF(" + traceAttributeTextSQL("ant.username") + ", ''), NULLIF(" + traceAttributeTextSQL("user.id") + ", ''))"
}

func traceTagsSQL() string {
	return traceAttributeTextSQL("langfuse.trace.tags")
}

func traceModelSQL() string {
	return "COALESCE(NULLIF(" + traceAttributeTextSQL("gen_ai.request.model") + ", ''), NULLIF(" + traceAttributeTextSQL("gen_ai.response.model") + ", ''))"
}

func traceInputSQL() string {
	return "COALESCE(NULLIF(" + traceAttributeTextSQL("gen_ai.input.messages") + ", ''), NULLIF(" + traceAttributeTextSQL("langfuse.observation.input") + ", ''), NULLIF(" + traceAttributeTextSQL("input") + ", ''), '')"
}

func traceOutputSQL() string {
	return "COALESCE(NULLIF(" + traceAttributeTextSQL("gen_ai.output.messages") + ", ''), NULLIF(" + traceAttributeTextSQL("langfuse.observation.output") + ", ''), NULLIF(" + traceAttributeTextSQL("output") + ", ''), '')"
}

func (store *oceanBaseStore) listTraceFacets(ctx context.Context, orgID string, params nativeListParams) (nativeFacets, error) {
	return store.nativeFacets(ctx, orgID, params, "trace_id", true)
}

func (store *oceanBaseStore) nativeSessionFacets(ctx context.Context, orgID string, params nativeListParams) (nativeFacets, error) {
	return store.nativeFacets(ctx, orgID, params, "session_id", false)
}

func (store *oceanBaseStore) nativeFacets(ctx context.Context, orgID string, params nativeListParams, entityColumn string, includeTags bool) (nativeFacets, error) {
	result := nativeFacets{}
	for _, dimension := range []struct {
		name       string
		expression string
	}{
		{"env", traceEnvSQL()},
		{"username", traceUsernameSQL()},
		{"scene", traceSceneSQL()},
	} {
		where, args, err := nativeTraceWhereExcluding(orgID, params, dimension.name)
		if err != nil {
			return nil, err
		}
		if entityColumn == "session_id" {
			where += " AND session_id IS NOT NULL AND session_id != ''"
		}
		query := "SELECT " + dimension.expression + " AS value, COUNT(DISTINCT " + entityColumn + ") AS count FROM " + store.tracesTable() + " WHERE " + where + " AND " + dimension.expression + " IS NOT NULL AND " + dimension.expression + " != '' GROUP BY value ORDER BY count DESC LIMIT 100"
		rows, err := store.queryRows(ctx, query, args...)
		if err != nil {
			return nil, err
		}
		values := make([]nativeFacetValue, 0, len(rows))
		for _, row := range rows {
			count, conversionErr := asInt64(row["count"])
			if conversionErr != nil {
				return nil, conversionErr
			}
			values = append(values, nativeFacetValue{Value: row["value"], Count: int(count)})
		}
		result[dimension.name] = values
	}
	if includeTags {
		tags, err := store.nativeTagFacets(ctx, orgID, params)
		if err != nil {
			return nil, err
		}
		result["tags"] = tags
	}
	return result, nil
}

func (store *oceanBaseStore) nativeTagFacets(ctx context.Context, orgID string, params nativeListParams) ([]nativeFacetValue, error) {
	where, args, err := nativeTraceWhereExcluding(orgID, params, "tags")
	if err != nil {
		return nil, err
	}
	query := "SELECT trace_id, " + rootPreferredSQL(traceTagsSQL()) + " AS raw_tags FROM " + store.tracesTable() + " WHERE " + where + " GROUP BY trace_id LIMIT ?"
	args = append(args, 5000)
	rows, err := store.queryRows(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, row := range rows {
		for _, tag := range decodeNativeTags(row["raw_tags"]) {
			counts[tag]++
		}
	}
	type tagCount struct {
		tag   string
		count int
	}
	sorted := make([]tagCount, 0, len(counts))
	for tag, count := range counts {
		sorted = append(sorted, tagCount{tag: tag, count: count})
	}
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].count == sorted[j].count {
			return sorted[i].tag < sorted[j].tag
		}
		return sorted[i].count > sorted[j].count
	})
	if len(sorted) > 100 {
		sorted = sorted[:100]
	}
	result := make([]nativeFacetValue, 0, len(sorted))
	for _, item := range sorted {
		result = append(result, nativeFacetValue{Value: item.tag, Count: item.count})
	}
	return result, nil
}

func decodeNativeTags(value any) []string {
	var raw []any
	switch typed := value.(type) {
	case []any:
		raw = typed
	case []string:
		result := make([]string, 0, len(typed))
		for _, tag := range typed {
			if tag = strings.TrimSpace(tag); tag != "" {
				result = append(result, tag)
			}
		}
		return result
	case string:
		text := strings.TrimSpace(typed)
		if text == "" {
			return nil
		}
		if json.Unmarshal([]byte(text), &raw) != nil {
			return []string{text}
		}
	default:
		return nil
	}
	result := make([]string, 0, len(raw))
	for _, item := range raw {
		if text := strings.TrimSpace(fmt.Sprint(item)); text != "" && text != "<nil>" {
			result = append(result, text)
		}
	}
	return result
}

func (store *oceanBaseStore) getTraceIOBatch(ctx context.Context, orgID string, params nativeListParams) (nativeIOBatchResponse, error) {
	ids := uniqueNativeIDs(params.TraceIDs)
	params.TraceIDs = ids
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeIOBatchResponse{}, err
	}
	rows, err := store.queryRows(ctx, "SELECT trace_id, attributes FROM "+store.tracesTable()+" WHERE "+where+" ORDER BY trace_id ASC, timestamp ASC", args...)
	if err != nil {
		return nativeIOBatchResponse{}, err
	}
	items := make(map[string]*nativeIOItem, len(ids))
	for _, id := range ids {
		items[id] = &nativeIOItem{ID: id}
	}
	for _, row := range rows {
		id := fmt.Sprint(row["trace_id"])
		item := items[id]
		if item == nil {
			continue
		}
		if item.Input == nil {
			item.Input = nativeAttributeValue(row["attributes"], "gen_ai.input.messages", "langfuse.observation.input", "input")
		}
		if output := nativeAttributeValue(row["attributes"], "gen_ai.output.messages", "langfuse.observation.output", "output"); output != nil {
			item.Output = output
		}
	}
	result := make([]nativeIOItem, 0, len(ids))
	for _, id := range ids {
		result = append(result, *items[id])
	}
	return nativeIOBatchResponse{Data: result}, nil
}

func (store *oceanBaseStore) getSessionIOBatch(ctx context.Context, orgID string, params nativeListParams) (nativeIOBatchResponse, error) {
	ids := uniqueNativeIDs(params.SessionIDs)
	params.SessionIDs = ids
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeIOBatchResponse{}, err
	}
	rows, err := store.queryRows(ctx, "SELECT session_id, attributes FROM "+store.tracesTable()+" WHERE "+where+" ORDER BY session_id ASC, timestamp ASC", args...)
	if err != nil {
		return nativeIOBatchResponse{}, err
	}
	items := make(map[string]*nativeIOItem, len(ids))
	for _, id := range ids {
		items[id] = &nativeIOItem{ID: id}
	}
	for _, row := range rows {
		id := fmt.Sprint(row["session_id"])
		item := items[id]
		if item == nil {
			continue
		}
		if item.Input == nil {
			item.Input = nativeAttributeValue(row["attributes"], "gen_ai.input.messages", "langfuse.observation.input", "input")
		}
		if output := nativeAttributeValue(row["attributes"], "gen_ai.output.messages", "langfuse.observation.output", "output"); output != nil {
			item.Output = output
		}
	}
	result := make([]nativeIOItem, 0, len(ids))
	for _, id := range ids {
		result = append(result, *items[id])
	}
	return nativeIOBatchResponse{Data: result}, nil
}

func nativeAttributeValue(raw any, keys ...string) any {
	attributes, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	for _, key := range keys {
		if value, exists := attributes[key]; exists && value != nil && fmt.Sprint(value) != "" {
			return value
		}
	}
	return nil
}

func (store *oceanBaseStore) getTraceUsageBatch(ctx context.Context, orgID string, params nativeListParams) (nativeUsageBatchResponse, error) {
	return store.nativeUsageBatch(ctx, orgID, params, "trace_id", uniqueNativeIDs(params.TraceIDs))
}

func (store *oceanBaseStore) getSessionUsageBatch(ctx context.Context, orgID string, params nativeListParams) (nativeUsageBatchResponse, error) {
	return store.nativeUsageBatch(ctx, orgID, params, "session_id", uniqueNativeIDs(params.SessionIDs))
}

func (store *oceanBaseStore) nativeUsageBatch(ctx context.Context, orgID string, params nativeListParams, idColumn string, ids []string) (nativeUsageBatchResponse, error) {
	if idColumn == "trace_id" {
		params.TraceIDs = ids
	} else {
		params.SessionIDs = ids
	}
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeUsageBatchResponse{}, err
	}
	query := "SELECT " + idColumn + " AS id, " + inputTokenSumSQL() + " AS input_tokens, " + outputTokenSumSQL() + " AS output_tokens, " + totalTokenSumSQL() + " AS total_tokens FROM " + store.tracesTable() + " WHERE " + where + " GROUP BY " + idColumn
	rows, err := store.queryRows(ctx, query, args...)
	if err != nil {
		return nativeUsageBatchResponse{}, err
	}
	byID := make(map[string]nativeUsageItem, len(ids))
	for _, id := range ids {
		byID[id] = newNativeUsageItem(id, 0, 0, 0)
	}
	for _, row := range rows {
		id := fmt.Sprint(row["id"])
		input, _ := asFloat64(row["input_tokens"])
		output, _ := asFloat64(row["output_tokens"])
		total, _ := asFloat64(row["total_tokens"])
		byID[id] = newNativeUsageItem(id, input, output, total)
	}
	result := make([]nativeUsageItem, 0, len(ids))
	for _, id := range ids {
		result = append(result, byID[id])
	}
	return nativeUsageBatchResponse{Data: result}, nil
}

func newNativeUsageItem(id string, input, output, total float64) nativeUsageItem {
	return nativeUsageItem{
		ID: id, InputTokens: input, OutputTokens: output, TotalTokens: total,
		UsageDetails: map[string]any{"input": input, "output": output, "total": total},
		Usage: map[string]any{
			"input": input, "output": output, "total": total,
			"input_tokens": input, "output_tokens": output, "total_tokens": total,
		},
	}
}

func (store *oceanBaseStore) getSpanBatch(ctx context.Context, orgID string, params nativeListParams) (nativeSpanBatchResponse, error) {
	where, args, err := nativeTraceWhere(orgID, params)
	if err != nil {
		return nativeSpanBatchResponse{}, err
	}
	rows, err := store.queryRows(ctx, "SELECT "+nativeSpanProjection+" FROM "+store.tracesTable()+" WHERE "+where+" ORDER BY timestamp ASC", args...)
	if err != nil {
		return nativeSpanBatchResponse{}, err
	}
	for _, row := range rows {
		if resource, ok := row["resource_attributes"]; ok {
			row["resource"] = resource
		}
		normalizeNativeSpan(row)
	}
	return nativeSpanBatchResponse{Spans: rows}, nil
}

func firstInt(rows []map[string]any, key string) (int64, error) {
	if len(rows) == 0 || rows[0][key] == nil {
		return 0, nil
	}
	return asInt64(rows[0][key])
}

func buildPageMeta(page, limit, total int) pageMeta {
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return pageMeta{Page: page, Limit: limit, TotalItems: total, TotalPages: totalPages}
}

func dashboardStringParam(params map[string]any, key, fallback string) string {
	if value, ok := params[key].(string); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func dashboardAggregation(params map[string]any) (string, error) {
	name := strings.ToLower(dashboardStringParam(params, "aggregation", "sum"))
	switch name {
	case "sum", "avg", "count":
		return name, nil
	default:
		return "", fmt.Errorf("unsupported dashboard aggregation %q", name)
	}
}

func dashboardStepMS(params map[string]any, rangeMS int64) int64 {
	if value, ok := params["step_ms"]; ok {
		if parsed, err := strconv.ParseInt(fmt.Sprint(value), 10, 64); err == nil && parsed > 0 {
			return parsed
		}
	}
	if value, ok := params["step_seconds"]; ok {
		if parsed, err := strconv.ParseInt(fmt.Sprint(value), 10, 64); err == nil && parsed > 0 {
			return parsed * 1000
		}
	}
	step := rangeMS / 200
	if step < 1000 {
		return 1000
	}
	return step
}

func metricDashboardColumns() []dashboardColumn {
	return []dashboardColumn{{Key: "time", Type: "timestamp"}, {Key: "value", Type: "number"}}
}

func dashboardColumns(keys ...string) []dashboardColumn {
	columns := make([]dashboardColumn, 0, len(keys))
	for _, key := range keys {
		columns = append(columns, dashboardColumn{Key: key, Type: "number"})
	}
	return columns
}

func mixedDashboardColumns(columns ...dashboardColumn) []dashboardColumn {
	return columns
}

func dashboardLimit(params map[string]any, maxLimit int) int {
	limit := 200
	if value, ok := params["limit"]; ok {
		if parsed, err := strconv.Atoi(fmt.Sprint(value)); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

func logTextAttributeSQL(key string) string {
	return `JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."` + key + `"'))`
}

func logNumberAttributeSQL(key string) string {
	return `COALESCE(CAST(NULLIF(` + logTextAttributeSQL(key) + `, '') AS DECIMAL(38,9)), 0)`
}

func logTokenSumSQL(key string) string {
	return "SUM(" + logNumberAttributeSQL(key) + ")"
}

func (store *oceanBaseStore) tracesTable() string {
	return telemetryTable(store.cfg.TablePrefix, "traces")
}

func (store *oceanBaseStore) logsTable() string {
	return telemetryTable(store.cfg.TablePrefix, "logs")
}

func inputTokenValueSQL() string {
	return `COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."gen_ai.usage.input_tokens"')), '') AS UNSIGNED), 0)`
}

func outputTokenValueSQL() string {
	return `COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."gen_ai.usage.output_tokens"')), '') AS UNSIGNED), 0)`
}

func totalTokenValueSQL() string {
	return `COALESCE(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."gen_ai.usage.total_tokens"')), '') AS UNSIGNED), ` + inputTokenValueSQL() + ` + ` + outputTokenValueSQL() + `)`
}

func inputTokenSumSQL() string {
	return "SUM(" + inputTokenValueSQL() + ")"
}

func outputTokenSumSQL() string {
	return "SUM(" + outputTokenValueSQL() + ")"
}

func totalTokenSumSQL() string {
	return "SUM(" + totalTokenValueSQL() + ")"
}
