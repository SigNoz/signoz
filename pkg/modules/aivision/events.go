package aivision

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	defaultEventPageSize = 50
	maxEventPageSize     = 200
	maxEventFilters      = 20
	maxEventDimensions   = 10
	maxEventInValues     = 100
)

type eventIdentity struct {
	SpaceID      string `json:"space_id"`
	AgentProduct string `json:"agent_product"`
	User         string `json:"user"`
}

type eventMetadataRequest struct {
	SpaceID      string
	AgentProduct string
}

type eventMetadataField struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type eventMetadataResponse struct {
	Fields          []eventMetadataField `json:"fields"`
	CanonicalFields []eventPublicField   `json:"canonicalFields"`
}

type eventPublicField struct {
	Key        string `json:"key"`
	Type       string `json:"type"`
	Filterable bool   `json:"filterable"`
	Sortable   bool   `json:"sortable"`
}

type eventFilter struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value any    `json:"value"`
}

type eventListRequest struct {
	eventIdentity
	From    int64         `json:"from"`
	To      int64         `json:"to"`
	Page    int           `json:"page"`
	Limit   int           `json:"limit"`
	Fields  []string      `json:"fields"`
	Filters []eventFilter `json:"filters"`
	OrderBy string        `json:"orderBy"`
	Keyword string        `json:"keyword"`
}

type eventListResponse struct {
	Data []map[string]any `json:"data"`
	Meta pageMeta         `json:"meta"`
}

type eventFacetRequest struct {
	eventIdentity
	From       int64         `json:"from"`
	To         int64         `json:"to"`
	Dimensions []string      `json:"dimensions"`
	Filters    []eventFilter `json:"filters"`
	Limit      int           `json:"limit"`
}

type eventFacetResponse struct {
	Data map[string][]map[string]any `json:"data"`
	Meta map[string]any              `json:"meta"`
}

type eventFieldDefinition struct {
	Type       string
	Expression string
	Sortable   bool
}

type eventListStatements struct {
	RowsSQL   string
	RowsArgs  []any
	CountSQL  string
	CountArgs []any
	Fields    []string
	Page      int
	Limit     int
}

type eventFacetStatement struct {
	Dimension string
	SQL       string
	Args      []any
}

var eventFieldOrder = []string{
	"time",
	"event_name",
	"event_kind",
	"trace_id",
	"span_id",
	"session_id",
	"username",
	"env",
	"scene",
	"model",
	"duration_ms",
	"status",
}

func eventFieldDefinitions() map[string]eventFieldDefinition {
	attributeText := func(key string) string {
		return `JSON_UNQUOTE(JSON_EXTRACT(attributes, '$."` + key + `"'))`
	}
	resourceText := func(key string) string {
		return `JSON_UNQUOTE(JSON_EXTRACT(resource_attributes, '$."` + key + `"'))`
	}
	return map[string]eventFieldDefinition{
		"time":        {Type: "datetime", Expression: "timestamp", Sortable: true},
		"event_name":  {Type: "string", Expression: "COALESCE(NULLIF(event_name, ''), NULLIF(" + attributeText("event.name") + ", ''))", Sortable: true},
		"event_kind":  {Type: "string", Expression: "COALESCE(NULLIF(" + attributeText("event.kind") + ", ''), NULLIF(" + attributeText("gen_ai.span.kind") + ", ''))"},
		"trace_id":    {Type: "string", Expression: "trace_id", Sortable: true},
		"span_id":     {Type: "string", Expression: "span_id"},
		"session_id":  {Type: "string", Expression: "session_id", Sortable: true},
		"username":    {Type: "string", Expression: "user_id", Sortable: true},
		"env":         {Type: "string", Expression: "COALESCE(NULLIF(" + resourceText("ant.agent.env") + ", ''), NULLIF(" + resourceText("deployment.environment") + ", ''), NULLIF(" + attributeText("environment") + ", ''), NULLIF(" + attributeText("env") + ", ''))", Sortable: true},
		"scene":       {Type: "string", Expression: "COALESCE(NULLIF(" + resourceText("ant.agent.scene") + ", ''), NULLIF(" + attributeText("ant.scene") + ", ''), NULLIF(" + attributeText("scene") + ", ''))"},
		"model":       {Type: "string", Expression: "COALESCE(NULLIF(" + attributeText("gen_ai.request.model") + ", ''), NULLIF(" + attributeText("gen_ai.response.model") + ", ''), NULLIF(" + attributeText("model") + ", ''))", Sortable: true},
		"duration_ms": {Type: "number", Expression: "CAST(NULLIF(" + attributeText("duration_ms") + ", '') AS DECIMAL(38,9))", Sortable: true},
		"status":      {Type: "string", Expression: "COALESCE(NULLIF(" + attributeText("status_code") + ", ''), NULLIF(" + attributeText("status") + ", ''), NULLIF(severity_text, ''))"},
	}
}

func eventPhysicalMetadata() []eventMetadataField {
	return []eventMetadataField{
		{Name: "org_id", Type: "string"},
		{Name: "space_id", Type: "string"},
		{Name: "log_id", Type: "string"},
		{Name: "timestamp", Type: "bigint"},
		{Name: "timestamp_unix_nano", Type: "bigint"},
		{Name: "observed_time_unix_nano", Type: "bigint"},
		{Name: "trace_id", Type: "string"},
		{Name: "span_id", Type: "string"},
		{Name: "flags", Type: "bigint"},
		{Name: "severity_number", Type: "smallint"},
		{Name: "severity_text", Type: "string"},
		{Name: "severity", Type: "string"},
		{Name: "event_name", Type: "string"},
		{Name: "body_text", Type: "text"},
		{Name: "body", Type: "text"},
		{Name: "body_json", Type: "json"},
		{Name: "service_name", Type: "string"},
		{Name: "resource_schema_url", Type: "string"},
		{Name: "scope_schema_url", Type: "string"},
		{Name: "scope_name", Type: "string"},
		{Name: "scope_version", Type: "string"},
		{Name: "scope_attributes", Type: "json"},
		{Name: "resource_attributes", Type: "json"},
		{Name: "attributes", Type: "json"},
		{Name: "payload", Type: "json"},
		{Name: "run_id", Type: "string"},
		{Name: "session_id", Type: "string"},
		{Name: "user_id", Type: "string"},
		{Name: "agent_product", Type: "string"},
		{Name: "agent_name", Type: "string"},
		{Name: "updated_at", Type: "datetime"},
	}
}

func (store *oceanBaseStore) eventMetadata(_ context.Context, _ string, request eventMetadataRequest) (eventMetadataResponse, error) {
	if err := validateEventIdentity(eventIdentity{SpaceID: request.SpaceID, AgentProduct: request.AgentProduct}); err != nil {
		return eventMetadataResponse{}, err
	}
	definitions := eventFieldDefinitions()
	canonical := make([]eventPublicField, 0, len(eventFieldOrder))
	for _, key := range eventFieldOrder {
		definition := definitions[key]
		canonical = append(canonical, eventPublicField{
			Key: key, Type: definition.Type, Filterable: true, Sortable: definition.Sortable,
		})
	}
	return eventMetadataResponse{Fields: eventPhysicalMetadata(), CanonicalFields: canonical}, nil
}

func (store *oceanBaseStore) listEvents(ctx context.Context, orgID string, request eventListRequest) (eventListResponse, error) {
	statements, err := buildEventListStatements(orgID, request, store.cfg)
	if err != nil {
		return eventListResponse{}, err
	}
	countRows, err := store.queryRows(ctx, statements.CountSQL, statements.CountArgs...)
	if err != nil {
		return eventListResponse{}, err
	}
	total, err := firstInt(countRows, "total_items")
	if err != nil {
		return eventListResponse{}, err
	}
	rows, err := store.queryRows(ctx, statements.RowsSQL, statements.RowsArgs...)
	if err != nil {
		return eventListResponse{}, err
	}
	normalizeEventRows(rows)
	return eventListResponse{
		Data: rows,
		Meta: buildEventPageMeta(statements.Page, statements.Limit, int(total)),
	}, nil
}

func buildEventPageMeta(page, limit, total int) pageMeta {
	meta := buildPageMeta(page, limit, total)
	if meta.TotalPages == 0 {
		meta.TotalPages = 1
	}
	return meta
}

func (store *oceanBaseStore) listEventFacets(ctx context.Context, orgID string, request eventFacetRequest) (eventFacetResponse, error) {
	statements, limit, err := buildEventFacetStatements(orgID, request, store.cfg)
	if err != nil {
		return eventFacetResponse{}, err
	}
	data := make(map[string][]map[string]any, len(statements))
	for _, statement := range statements {
		rows, err := store.queryRows(ctx, statement.SQL, statement.Args...)
		if err != nil {
			return eventFacetResponse{}, err
		}
		for _, row := range rows {
			if count, conversionErr := asInt64(row["count"]); conversionErr == nil {
				row["count"] = count
			}
		}
		data[statement.Dimension] = rows
	}
	return eventFacetResponse{Data: data, Meta: map[string]any{"limit": limit}}, nil
}

func buildEventListStatements(orgID string, request eventListRequest, cfg config) (eventListStatements, error) {
	where, args, err := buildEventWhere(orgID, request.eventIdentity, request.From, request.To, request.Filters, request.Keyword, cfg.MaxQueryRange)
	if err != nil {
		return eventListStatements{}, err
	}
	fields, err := normalizeEventFields(request.Fields)
	if err != nil {
		return eventListStatements{}, err
	}
	page := request.Page
	if page <= 0 {
		page = 1
	}
	if page > 1_000_000 {
		return eventListStatements{}, fmt.Errorf("page exceeds maximum")
	}
	limit := request.Limit
	if limit <= 0 {
		limit = defaultEventPageSize
	}
	maximum := maxEventPageSize
	if cfg.MaxLimit > 0 && cfg.MaxLimit < maximum {
		maximum = cfg.MaxLimit
	}
	if limit > maximum {
		limit = maximum
	}

	definitions := eventFieldDefinitions()
	selects := make([]string, 0, len(fields))
	for _, field := range fields {
		selects = append(selects, definitions[field].Expression+" AS "+field)
	}
	orderBy, err := eventOrderBy(request.OrderBy, definitions)
	if err != nil {
		return eventListStatements{}, err
	}
	offset := (page - 1) * limit
	table := telemetryTable(cfg.TablePrefix, "logs")
	return eventListStatements{
		RowsSQL:   "SELECT " + strings.Join(selects, ", ") + " FROM " + table + " WHERE " + where + " ORDER BY " + orderBy + " LIMIT ? OFFSET ?",
		RowsArgs:  append(append([]any{}, args...), limit, offset),
		CountSQL:  "SELECT COUNT(*) AS total_items FROM " + table + " WHERE " + where,
		CountArgs: append([]any{}, args...),
		Fields:    fields,
		Page:      page,
		Limit:     limit,
	}, nil
}

func buildEventFacetStatements(orgID string, request eventFacetRequest, cfg config) ([]eventFacetStatement, int, error) {
	where, args, err := buildEventWhere(orgID, request.eventIdentity, request.From, request.To, request.Filters, "", cfg.MaxQueryRange)
	if err != nil {
		return nil, 0, err
	}
	dimensions := request.Dimensions
	if len(dimensions) == 0 {
		dimensions = []string{"event_name", "env", "username", "scene", "model"}
	}
	if len(dimensions) > maxEventDimensions {
		return nil, 0, fmt.Errorf("dimensions exceeds maximum")
	}
	definitions := eventFieldDefinitions()
	seen := make(map[string]struct{}, len(dimensions))
	normalized := make([]string, 0, len(dimensions))
	for _, dimension := range dimensions {
		if _, ok := definitions[dimension]; !ok {
			return nil, 0, fmt.Errorf("invalid event facet field %q", dimension)
		}
		if _, ok := seen[dimension]; ok {
			continue
		}
		seen[dimension] = struct{}{}
		normalized = append(normalized, dimension)
	}
	limit := request.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	table := telemetryTable(cfg.TablePrefix, "logs")
	statements := make([]eventFacetStatement, 0, len(normalized))
	for _, dimension := range normalized {
		expression := definitions[dimension].Expression
		statements = append(statements, eventFacetStatement{
			Dimension: dimension,
			SQL:       "SELECT " + expression + " AS value, COUNT(*) AS count FROM " + table + " WHERE " + where + " GROUP BY value ORDER BY count DESC LIMIT ?",
			Args:      append(append([]any{}, args...), limit),
		})
	}
	return statements, limit, nil
}

func buildEventWhere(orgID string, identity eventIdentity, from, to int64, filters []eventFilter, keyword string, maxRange time.Duration) (string, []any, error) {
	if err := validateEventIdentity(identity); err != nil {
		return "", nil, err
	}
	if err := validateRange(from, to, maxRange); err != nil {
		return "", nil, err
	}
	if from > math.MaxInt64/int64(time.Millisecond) || to > math.MaxInt64/int64(time.Millisecond) {
		return "", nil, fmt.Errorf("event time range is outside supported epoch milliseconds")
	}
	where := []string{"org_id = ?", "space_id = ?", "agent_product = ?", "timestamp >= ?", "timestamp <= ?"}
	args := []any{orgID, strings.TrimSpace(identity.SpaceID), strings.TrimSpace(identity.AgentProduct), from * int64(time.Millisecond), to * int64(time.Millisecond)}
	if user := strings.TrimSpace(identity.User); user != "" {
		where = append(where, "user_id = ?")
		args = append(args, user)
	}
	if len(filters) > maxEventFilters {
		return "", nil, fmt.Errorf("filters exceeds maximum")
	}
	definitions := eventFieldDefinitions()
	for _, filter := range filters {
		definition, ok := definitions[filter.Field]
		if !ok {
			return "", nil, fmt.Errorf("invalid event filter field %q", filter.Field)
		}
		clause, values, err := compileEventFilter(filter, definition)
		if err != nil {
			return "", nil, err
		}
		where = append(where, clause)
		args = append(args, values...)
	}
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		if len(keyword) > 512 {
			return "", nil, fmt.Errorf("keyword exceeds maximum")
		}
		where = append(where, definitions["event_name"].Expression+" LIKE ? ESCAPE '\\\\'")
		args = append(args, "%"+escapeLike(keyword)+"%")
	}
	return strings.Join(where, " AND "), args, nil
}

func validateEventIdentity(identity eventIdentity) error {
	spaceID := strings.TrimSpace(identity.SpaceID)
	agentProduct := strings.TrimSpace(identity.AgentProduct)
	if spaceID == "" || len(spaceID) > 255 {
		return fmt.Errorf("space_id must contain between 1 and 255 bytes")
	}
	if agentProduct == "" || len(agentProduct) > 255 {
		return fmt.Errorf("agent_product must contain between 1 and 255 bytes")
	}
	if len(strings.TrimSpace(identity.User)) > 255 {
		return fmt.Errorf("user must contain at most 255 bytes")
	}
	return nil
}

func normalizeEventFields(fields []string) ([]string, error) {
	if len(fields) == 0 {
		return []string{"time", "event_name", "trace_id", "session_id", "username"}, nil
	}
	if len(fields) > len(eventFieldOrder) {
		return nil, fmt.Errorf("fields exceeds maximum")
	}
	definitions := eventFieldDefinitions()
	seen := make(map[string]struct{}, len(fields))
	result := make([]string, 0, len(fields))
	for _, field := range fields {
		if _, ok := definitions[field]; !ok {
			return nil, fmt.Errorf("invalid event field %q", field)
		}
		if _, ok := seen[field]; ok {
			continue
		}
		seen[field] = struct{}{}
		result = append(result, field)
	}
	if len(result) == 0 {
		return nil, fmt.Errorf("fields must not be empty")
	}
	return result, nil
}

func eventOrderBy(raw string, definitions map[string]eventFieldDefinition) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return definitions["time"].Expression + " DESC", nil
	}
	direction := "ASC"
	field := raw
	if strings.HasPrefix(field, "-") {
		direction = "DESC"
		field = strings.TrimPrefix(field, "-")
	}
	definition, ok := definitions[field]
	if !ok || !definition.Sortable {
		return "", fmt.Errorf("invalid or unsortable event orderBy field %q", field)
	}
	return definition.Expression + " " + direction, nil
}

func compileEventFilter(filter eventFilter, definition eventFieldDefinition) (string, []any, error) {
	operator := strings.ToUpper(strings.Join(strings.Fields(strings.TrimSpace(filter.Op)), " "))
	if operator == "" {
		operator = "="
	}
	switch operator {
	case "=", ">=", "<=":
		value, err := normalizeEventFilterValue(filter.Field, filter.Value)
		if err != nil {
			return "", nil, err
		}
		return definition.Expression + " " + operator + " ?", []any{value}, nil
	case "IN":
		values, ok := filter.Value.([]any)
		if !ok || len(values) == 0 || len(values) > maxEventInValues {
			return "", nil, fmt.Errorf("IN filter value must contain between 1 and %d items", maxEventInValues)
		}
		placeholders := make([]string, 0, len(values))
		args := make([]any, 0, len(values))
		for _, value := range values {
			normalized, err := normalizeEventFilterValue(filter.Field, value)
			if err != nil {
				return "", nil, err
			}
			placeholders = append(placeholders, "?")
			args = append(args, normalized)
		}
		return definition.Expression + " IN (" + strings.Join(placeholders, ",") + ")", args, nil
	case "LIKE":
		value, ok := filter.Value.(string)
		if !ok || len(value) > 512 {
			return "", nil, fmt.Errorf("LIKE filter value must be a string of at most 512 bytes")
		}
		return definition.Expression + " LIKE ? ESCAPE '\\\\'", []any{value}, nil
	case "IS NULL":
		return definition.Expression + " IS NULL", nil, nil
	case "IS NOT NULL":
		return definition.Expression + " IS NOT NULL", nil, nil
	default:
		return "", nil, fmt.Errorf("unsupported event filter operator %q", filter.Op)
	}
}

func normalizeEventFilterValue(field string, value any) (any, error) {
	if field != "time" {
		switch value.(type) {
		case []any, map[string]any:
			return nil, fmt.Errorf("event filter value must be a scalar")
		}
		return value, nil
	}
	var millis int64
	switch typed := value.(type) {
	case float64:
		if typed != math.Trunc(typed) || typed < 0 || typed > float64(math.MaxInt64/int64(time.Millisecond)) {
			return nil, fmt.Errorf("time filter value must be epoch milliseconds or RFC3339")
		}
		millis = int64(typed)
	case string:
		if parsed, err := strconv.ParseInt(typed, 10, 64); err == nil {
			millis = parsed
		} else if parsed, err := time.Parse(time.RFC3339, typed); err == nil {
			millis = parsed.UnixMilli()
		} else {
			return nil, fmt.Errorf("time filter value must be epoch milliseconds or RFC3339")
		}
	case int64:
		millis = typed
	case int:
		millis = int64(typed)
	default:
		return nil, fmt.Errorf("time filter value must be epoch milliseconds or RFC3339")
	}
	if millis < 0 || millis > math.MaxInt64/int64(time.Millisecond) {
		return nil, fmt.Errorf("time filter value is outside supported range")
	}
	return millis * int64(time.Millisecond), nil
}

func normalizeEventRows(rows []map[string]any) {
	for _, row := range rows {
		value, ok := row["time"]
		if !ok {
			continue
		}
		nanos, err := asInt64(value)
		if err == nil && nanos >= 0 {
			row["time"] = time.Unix(0, nanos).UTC().Format(time.RFC3339Nano)
		}
	}
}

func sortedEventMetadataFields(fields []eventMetadataField) []eventMetadataField {
	result := append([]eventMetadataField(nil), fields...)
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result
}
