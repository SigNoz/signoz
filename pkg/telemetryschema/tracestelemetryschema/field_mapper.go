package tracestelemetryschema

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var (
	indexV3Columns = map[string]*schema.Column{
		"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
		"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

		// intrinsic columns
		"timestamp":          {Name: "timestamp", Type: schema.DateTime64ColumnType{Precision: 9, Timezone: "UTC"}},
		"trace_id":           {Name: "trace_id", Type: schema.FixedStringColumnType{Length: 32}},
		"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
		"trace_state":        {Name: "trace_state", Type: schema.ColumnTypeString},
		"parent_span_id":     {Name: "parent_span_id", Type: schema.ColumnTypeString},
		"flags":              {Name: "flags", Type: schema.ColumnTypeUInt32},
		"name":               {Name: "name", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"kind":               {Name: "kind", Type: schema.ColumnTypeInt8},
		"kind_string":        {Name: "kind_string", Type: schema.ColumnTypeString},
		"duration_nano":      {Name: "duration_nano", Type: schema.ColumnTypeUInt64},
		"status_code":        {Name: "status_code", Type: schema.ColumnTypeInt16},
		"status_message":     {Name: "status_message", Type: schema.ColumnTypeString},
		"status_code_string": {Name: "status_code_string", Type: schema.ColumnTypeString},

		// attributes columns
		"attributes_string": {Name: "attributes_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"attributes_number": {Name: "attributes_number", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeFloat64,
		}},
		"attributes_bool": {Name: "attributes_bool", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeBool,
		}},
		"resources_string": {Name: "resources_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"resource": {Name: "resource", Type: schema.JSONColumnType{}},
		"scope":    {Name: "scope", Type: schema.JSONColumnType{}},

		"events": {Name: "events", Type: schema.ArrayColumnType{
			ElementType: schema.ColumnTypeString,
		}},
		"links": {Name: "links", Type: schema.ColumnTypeString},
		// derived columns
		"response_status_code": {Name: "response_status_code", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"external_http_url":    {Name: "external_http_url", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"http_url":             {Name: "http_url", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"external_http_method": {Name: "external_http_method", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"http_method":          {Name: "http_method", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"http_host":            {Name: "http_host", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"db_name":              {Name: "db_name", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"db_operation":         {Name: "db_operation", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"has_error":            {Name: "has_error", Type: schema.ColumnTypeBool},
		"is_remote":            {Name: "is_remote", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		// materialized columns
		"resource_string_service$$name":         {Name: "resource_string_service$$name", Type: schema.ColumnTypeString},
		"attribute_string_http$$route":          {Name: "attribute_string_http$$route", Type: schema.ColumnTypeString},
		"attribute_string_messaging$$system":    {Name: "attribute_string_messaging$$system", Type: schema.ColumnTypeString},
		"attribute_string_messaging$$operation": {Name: "attribute_string_messaging$$operation", Type: schema.ColumnTypeString},
		"attribute_string_db$$system":           {Name: "attribute_string_db$$system", Type: schema.ColumnTypeString},
		"attribute_string_rpc$$system":          {Name: "attribute_string_rpc$$system", Type: schema.ColumnTypeString},
		"attribute_string_rpc$$service":         {Name: "attribute_string_rpc$$service", Type: schema.ColumnTypeString},
		"attribute_string_rpc$$method":          {Name: "attribute_string_rpc$$method", Type: schema.ColumnTypeString},
		"attribute_string_peer$$service":        {Name: "attribute_string_peer$$service", Type: schema.ColumnTypeString},

		// deprecated intrinsic columns
		"traceID":          {Name: "traceID", Type: schema.FixedStringColumnType{Length: 32}},
		"spanID":           {Name: "spanID", Type: schema.ColumnTypeString},
		"parentSpanID":     {Name: "parentSpanID", Type: schema.ColumnTypeString},
		"spanKind":         {Name: "spanKind", Type: schema.ColumnTypeString},
		"durationNano":     {Name: "durationNano", Type: schema.ColumnTypeUInt64},
		"statusCode":       {Name: "statusCode", Type: schema.ColumnTypeInt16},
		"statusMessage":    {Name: "statusMessage", Type: schema.ColumnTypeString},
		"statusCodeString": {Name: "statusCodeString", Type: schema.ColumnTypeString},

		// deprecated derived columns
		"references":         {Name: "references", Type: schema.ColumnTypeString},
		"responseStatusCode": {Name: "responseStatusCode", Type: schema.ColumnTypeString},
		"externalHttpUrl":    {Name: "externalHttpUrl", Type: schema.ColumnTypeString},
		"httpUrl":            {Name: "httpUrl", Type: schema.ColumnTypeString},
		"externalHttpMethod": {Name: "externalHttpMethod", Type: schema.ColumnTypeString},
		"httpMethod":         {Name: "httpMethod", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"httpHost":           {Name: "httpHost", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"dbName":             {Name: "dbName", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"dbOperation":        {Name: "dbOperation", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"hasError":           {Name: "hasError", Type: schema.ColumnTypeBool},
		"isRemote":           {Name: "isRemote", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"serviceName":        {Name: "serviceName", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"httpRoute":          {Name: "httpRoute", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"msgSystem":          {Name: "msgSystem", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"msgOperation":       {Name: "msgOperation", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"dbSystem":           {Name: "dbSystem", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"rpcSystem":          {Name: "rpcSystem", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"rpcService":         {Name: "rpcService", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"rpcMethod":          {Name: "rpcMethod", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"peerService":        {Name: "peerService", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},

		// materialized exists columns
		"resource_string_service$$name_exists":         {Name: "resource_string_service$$name_exists", Type: schema.ColumnTypeBool},
		"attribute_string_http$$route_exists":          {Name: "attribute_string_http$$route_exists", Type: schema.ColumnTypeBool},
		"attribute_string_messaging$$system_exists":    {Name: "attribute_string_messaging$$system_exists", Type: schema.ColumnTypeBool},
		"attribute_string_messaging$$operation_exists": {Name: "attribute_string_messaging$$operation_exists", Type: schema.ColumnTypeBool},
		"attribute_string_db$$system_exists":           {Name: "attribute_string_db$$system_exists", Type: schema.ColumnTypeBool},
		"attribute_string_rpc$$system_exists":          {Name: "attribute_string_rpc$$system_exists", Type: schema.ColumnTypeBool},
		"attribute_string_rpc$$service_exists":         {Name: "attribute_string_rpc$$service_exists", Type: schema.ColumnTypeBool},
		"attribute_string_rpc$$method_exists":          {Name: "attribute_string_rpc$$method_exists", Type: schema.ColumnTypeBool},
		"attribute_string_peer$$service_exists":        {Name: "attribute_string_peer$$service_exists", Type: schema.ColumnTypeBool},
	}

	// TODO(srikanthccv): remove this mapping.
	oldToNew = map[string]string{
		// deprecated intrinsic -> new intrinsic
		"traceID":          "trace_id",
		"spanID":           "span_id",
		"parentSpanID":     "parent_span_id",
		"spanKind":         "kind_string",
		"durationNano":     "duration_nano",
		"statusCode":       "status_code",
		"statusMessage":    "status_message",
		"statusCodeString": "status_code_string",

		// deprecated derived -> new derived / materialized
		"references":         "links",
		"responseStatusCode": "response_status_code",
		"externalHttpUrl":    "external_http_url",
		"httpUrl":            "http_url",
		"externalHttpMethod": "external_http_method",
		"httpMethod":         "http_method",
		"httpHost":           "http_host",
		"dbName":             "db_name",
		"dbOperation":        "db_operation",
		"hasError":           "has_error",
		"isRemote":           "is_remote",
		"serviceName":        "resource_string_service$$name",
		"httpRoute":          "attribute_string_http$$route",
		"msgSystem":          "attribute_string_messaging$$system",
		"msgOperation":       "attribute_string_messaging$$operation",
		"dbSystem":           "attribute_string_db$$system",
		"rpcSystem":          "attribute_string_rpc$$system",
		"rpcService":         "attribute_string_rpc$$service",
		"rpcMethod":          "attribute_string_rpc$$method",
		"peerService":        "attribute_string_peer$$service",
	}
)

type fieldMapper struct{}

var _ qbtypes.FieldMapper = (*fieldMapper)(nil)

func NewFieldMapper() *fieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(
	_ context.Context,
	_, _ uint64,
	key *telemetrytypes.TelemetryFieldKey,
) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{indexV3Columns["resource"], indexV3Columns["resources_string"]}, nil
	case telemetrytypes.FieldContextScope:
		return []*schema.Column{indexV3Columns["scope"]}, nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return []*schema.Column{indexV3Columns["attributes_string"]}, nil
		case telemetrytypes.FieldDataTypeInt64,
			telemetrytypes.FieldDataTypeFloat64,
			telemetrytypes.FieldDataTypeNumber:
			return []*schema.Column{indexV3Columns["attributes_number"]}, nil
		case telemetrytypes.FieldDataTypeBool:
			return []*schema.Column{indexV3Columns["attributes_bool"]}, nil
		}
	case telemetrytypes.FieldContextSpan:
		// Check if this is a span scope field
		if strings.ToLower(key.Name) == SpanSearchScopeRoot || strings.ToLower(key.Name) == SpanSearchScopeEntryPoint {
			// The actual SQL will be generated in the condition builder
			return []*schema.Column{{Name: key.Name, Type: schema.ColumnTypeBool}}, nil
		}
		if _, ok := CalculatedFieldsDeprecated[key.Name]; ok {
			// Check if we have a mapping for the deprecated calculated field
			if col, ok := indexV3Columns[oldToNew[key.Name]]; ok {
				return []*schema.Column{col}, nil
			}
		}
		if _, ok := IntrinsicFieldsDeprecated[key.Name]; ok {
			// Check if we have a mapping for the deprecated intrinsic field
			if col, ok := indexV3Columns[oldToNew[key.Name]]; ok {
				return []*schema.Column{col}, nil
			}
		}

		if col, ok := indexV3Columns[key.Name]; ok {
			return []*schema.Column{col}, nil
		}
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) ColumnFor(
	ctx context.Context,
	_ valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
) ([]*schema.Column, error) {
	return m.getColumn(ctx, startNs, endNs, key)
}

// FieldFor returns the table field name for the given key if it exists
// otherwise it returns qbtypes.ErrColumnNotFound.
func (m *fieldMapper) FieldFor(
	ctx context.Context,
	_ valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
) (string, error) {
	// Special handling for span scope fields
	if key.FieldContext == telemetrytypes.FieldContextSpan &&
		(strings.ToLower(key.Name) == SpanSearchScopeRoot || strings.ToLower(key.Name) == SpanSearchScopeEntryPoint) {
		// Return the field name as-is, the condition builder will handle the SQL generation
		return key.Name, nil
	}

	exprs, existExpr, columns, err := m.resolveColumnExprs(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	if len(exprs) == 1 {
		return exprs[0], nil
	} else if len(exprs) > 1 {
		// Ensure existExpr has the same length as exprs
		if len(existExpr) != len(exprs) {
			return "", errors.New(errors.TypeInternal, errors.CodeInternal, "length of exist exprs doesn't match to that of exprs")
		}
		finalExprs := []string{}
		for i, expr := range exprs {
			finalExprs = append(finalExprs, fmt.Sprintf("%s, %s", existExpr[i], expr))
		}
		return "multiIf(" + strings.Join(finalExprs, ", ") + ", NULL)", nil
	}

	// should not reach here
	return columns[0].Name, nil
}

// resolveColumnExprs resolves key to its per-column value expressions and existence guards
// (after evolution selection); existExprs only carries guards for guardable column types.
func (m *fieldMapper) resolveColumnExprs(
	ctx context.Context,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
) (exprs []string, existExprs []string, columns []*schema.Column, err error) {
	columns, err = m.getColumn(ctx, startNs, endNs, key)
	if err != nil {
		return nil, nil, nil, err
	}

	newColumns, evolutionsEntries, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, startNs, endNs)
	if err != nil {
		return nil, nil, nil, err
	}

	for i, column := range newColumns {
		// Use evolution column name if available, otherwise use the column name
		columnName := column.Name
		if evolutionsEntries != nil && evolutionsEntries[i] != nil {
			columnName = evolutionsEntries[i].ColumnName
		}

		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			// have to add ::string as clickHouse throws an error :- data types Variant/Dynamic are not allowed in GROUP BY
			// once clickHouse dependency is updated, we need to check if we can remove it.
			switch key.FieldContext {
			case telemetrytypes.FieldContextResource:
				exprs = append(exprs, fmt.Sprintf("%s.`%s`::String", columnName, key.Name))
				existExprs = append(existExprs, fmt.Sprintf("%s.`%s` IS NOT NULL", columnName, key.Name))
			case telemetrytypes.FieldContextScope:
				if isDeclaredScopePath(key.Name) {
					// declared String paths on the scope column read '' for the missing case
					exprs = append(exprs, fmt.Sprintf("%s::String", key.Name))
					existExprs = append(existExprs, fmt.Sprintf("%s <> ''", key.Name))
				} else {
					exprs = append(exprs, fmt.Sprintf("%s.attributes.`%s`::String", columnName, key.Name))
					existExprs = append(existExprs, fmt.Sprintf("%s.attributes.`%s` IS NOT NULL", columnName, key.Name))
				}
			default:
				return nil, nil, nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource and scope context fields are supported for json columns, got %s", key.FieldContext.String)
			}
		case schema.ColumnTypeEnumString,
			schema.ColumnTypeEnumUInt64,
			schema.ColumnTypeEnumUInt32,
			schema.ColumnTypeEnumInt8,
			schema.ColumnTypeEnumInt16,
			schema.ColumnTypeEnumBool,
			schema.ColumnTypeEnumDateTime64,
			schema.ColumnTypeEnumFixedString:
			exprs = append(exprs, column.Name)
		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				exprs = append(exprs, column.Name)
			default:
				return nil, nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "value type %s is not supported for low cardinality column type %s", elementType, column.Type)
			}
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return nil, nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumFloat64, schema.ColumnTypeEnumBool:
				// a key could have been materialized, if so return the materialized column name
				if key.Materialized {
					exprs = append(exprs, telemetrytypes.FieldKeyToMaterializedColumnName(key))
					existExprs = append(existExprs, telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key))
				} else {
					exprs = append(exprs, fmt.Sprintf("%s['%s']", columnName, key.Name))
					existExprs = append(existExprs, fmt.Sprintf("mapContains(%s, '%s')", columnName, key.Name))
				}
			default:
				return nil, nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "value type %s is not supported for map column type %s", valueType, column.Type)
			}
		}
	}

	return exprs, existExprs, columns, nil
}

// resolveReferencedField resolves a referenced field to the candidate key(s) that select /
// group by / order by query for it, unioning every physical home the name maps to (a scope
// field and a same-named scope attribute, an attribute and a resource attribute, ...). Unlike
// the filter path, it does not collapse an attribute+resource collision to the resource key:
// select surfaces every home rather than narrowing. Returns the resolved candidates, or an
// error when the name matches nothing.
func resolveReferencedField(
	ctx context.Context,
	fm qbtypes.FieldMapper,
	orgID valuer.UUID,
	startNs, endNs uint64,
	field *telemetrytypes.TelemetryFieldKey,
	value any,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
) ([]*telemetrytypes.TelemetryFieldKey, error) {
	resolved := querybuilder.MatchingFieldKeys(field, fieldKeys)

	// A bare key that names a real column resolves to the column — first — keeping same-named
	// metadata keys under other contexts only where their type is consistent with the column, so
	// a corrupt entry (a string attribute named `timestamp`) can't degrade the intrinsic. The
	// column may already be among the matches (surfaced by metadata) or only reachable by probe.
	if field.FieldContext == telemetrytypes.FieldContextUnspecified && len(resolved) > 0 {
		var column *schema.Column
		var columnKey *telemetrytypes.TelemetryFieldKey
		for _, k := range resolved {
			if k.FieldContext == telemetrytypes.FieldContextSpan {
				if cols, err := fm.ColumnFor(ctx, orgID, startNs, endNs, k); err == nil && len(cols) > 0 {
					column, columnKey = cols[0], k
				}
				break
			}
		}
		if column == nil {
			probe := telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextSpan, field.FieldDataType)
			if cols, err := fm.ColumnFor(ctx, orgID, startNs, endNs, probe); err == nil && len(cols) > 0 {
				column, columnKey = cols[0], probe
			}
		}
		if column != nil {
			combined := []*telemetrytypes.TelemetryFieldKey{columnKey}
			for _, k := range resolved {
				if k == columnKey || k.FieldContext == telemetrytypes.FieldContextSpan {
					continue
				}
				if columnMatchesDataType(column, k.FieldDataType) {
					combined = append(combined, k)
				}
			}
			resolved = combined
		}
	}

	if len(resolved) > 0 {
		return resolved, nil
	}

	// Not in metadata: synthesize. Fold contexts (span/trace) get the map so a real column or a
	// stripped-name metadata match can win; strict contexts pass nil and keep their synthesize path.
	synth := fm.CandidateKeys(ctx, orgID, field, value, candidateLookupKeys(field, fieldKeys))
	if len(synth) == 0 {
		return nil, querybuilder.NewKeyNotFoundError(field.Name)
	}
	return synth, nil
}

// ColumnExpressionFor returns the bare (unaliased) SQL expression for the field, resolving
// unknown keys via CandidateKeys and wrapping guardable columns with exists-guard multiIfs
// so an absent key yields NULL.
func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	field *telemetrytypes.TelemetryFieldKey,
	requiredDataType telemetrytypes.FieldDataType,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	// Resolve the candidate column(s) the same way the filter path does, so select / group by /
	// order by union every physical home of a name exactly as a filter on it would.
	candidates, err := resolveReferencedField(ctx, m, orgID, startNs, endNs, field, nil, keys)
	if err != nil {
		return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name).WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field.Name, errors.NounKeys, maps.Keys(keys))...)
	}

	// Group-by/order (String) and aggregation (String/Float64): every candidate is
	// exists-guarded and coerced to requiredDataType, in a single multiIf. Raw select
	// (Unspecified) keeps the lighter native shape below.
	if requiredDataType != telemetrytypes.FieldDataTypeUnspecified {
		var dummyValue any = ""
		if requiredDataType == telemetrytypes.FieldDataTypeFloat64 {
			dummyValue = 0.0
		}
		stmts := make([]string, 0, len(candidates)*2)
		for _, key := range candidates {
			value, err := m.FieldFor(ctx, orgID, startNs, endNs, key)
			if err != nil {
				return "", err
			}
			guard, err := m.existsExpressionFor(ctx, orgID, startNs, endNs, key, true)
			if err != nil {
				return "", err
			}
			coerced := value
			// a time column keeps its native type; coercing it would yield seconds
			if temporal, err := m.columnIsTemporal(ctx, startNs, endNs, key); err != nil {
				return "", err
			} else if !temporal {
				coerced, _ = querybuilder.DataTypeCollisionHandledFieldName(key, dummyValue, value, qbtypes.FilterOperatorUnknown)
			}
			stmts = append(stmts, guard, coerced)
		}
		return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(stmts, ", ")), nil
	}

	if len(candidates) == 1 {
		value, err := m.FieldFor(ctx, orgID, startNs, endNs, candidates[0])
		if err != nil {
			return "", err
		}
		exprs, existExprs, _, _ := m.resolveColumnExprs(ctx, startNs, endNs, candidates[0])
		if len(exprs) == 1 && len(existExprs) == 1 {
			guard, err := m.existsExpressionFor(ctx, orgID, startNs, endNs, candidates[0], true)
			if err != nil {
				return "", err
			}
			return fmt.Sprintf("multiIf(%s, %s, NULL)", guard, value), nil
		}
		return value, nil
	}

	// Multiple candidates (collision / synth): multiIf picks the first that exists,
	// stringified so branches share a type.
	args := make([]string, 0, len(candidates))
	for _, key := range candidates {
		value, err := m.FieldFor(ctx, orgID, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		guard, err := m.existsExpressionFor(ctx, orgID, startNs, endNs, key, true)
		if err != nil {
			return "", err
		}
		args = append(args, fmt.Sprintf("%s, toString(%s)", guard, value))
	}
	return fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", ")), nil
}

// columnIsTemporal reports whether key resolves to a single time column, after evolution
// selection. Multiple columns mean an attribute-map union, which is never temporal.
func (m *fieldMapper) columnIsTemporal(ctx context.Context, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (bool, error) {
	columns, err := m.getColumn(ctx, startNs, endNs, key)
	if err != nil {
		return false, err
	}
	newColumns, _, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, startNs, endNs)
	if err != nil {
		return false, err
	}
	return len(newColumns) == 1 && querybuilder.ColumnIsTemporal(newColumns[0]), nil
}

// columnMatchesDataType reports whether a metadata field's data type is consistent with a
// column's ClickHouse type. A bare key's column is only unioned with same-named metadata
// keys that could be the same field; a string attribute named `timestamp` is corrupt
// metadata against the DateTime column and must not degrade the intrinsic.
func columnMatchesDataType(col *schema.Column, dt telemetrytypes.FieldDataType) bool {
	if dt == telemetrytypes.FieldDataTypeUnspecified {
		return true
	}
	switch col.Type.GetType() {
	case schema.ColumnTypeEnumBool:
		return dt == telemetrytypes.FieldDataTypeBool
	case schema.ColumnTypeEnumDateTime64:
		return false
	case schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32,
		schema.ColumnTypeEnumInt8, schema.ColumnTypeEnumInt16,
		schema.ColumnTypeEnumFloat64:
		return dt == telemetrytypes.FieldDataTypeInt64 ||
			dt == telemetrytypes.FieldDataTypeFloat64 ||
			dt == telemetrytypes.FieldDataTypeNumber
	default: // String, FixedString, LowCardinality(String), …
		return dt == telemetrytypes.FieldDataTypeString
	}
}

// CandidateKeys resolves a referenced field to the key(s) to query when it isn't already a
// resolved column. A bare key unions the real column with type-consistent same-named
// metadata keys; a forgiving span/trace context is honored as-is, correcting to a
// metadata match for the stripped name when present; strict attribute/resource contexts
// are honored as-is. Falls back to synthesized type-variant keys.
func (m *fieldMapper) CandidateKeys(ctx context.Context, _ valuer.UUID, field *telemetrytypes.TelemetryFieldKey, value any, keys map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	// A real column is considered before metadata for bare and forgiving contexts, so a
	// same-named corrupt attribute can't shadow the intrinsic/calculated column.
	switch field.FieldContext {
	case telemetrytypes.FieldContextUnspecified:
		// bare key: the column comes first, alongside same-named metadata keys under other
		// contexts whose type is consistent with the column (corrupt entries dropped).
		probe := telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextSpan, field.FieldDataType)
		if cols, err := m.getColumn(ctx, 0, 0, probe); err == nil && len(cols) > 0 {
			candidates := []*telemetrytypes.TelemetryFieldKey{probe}
			for _, match := range keys[field.Name] {
				if match.FieldContext != telemetrytypes.FieldContextSpan &&
					columnMatchesDataType(cols[0], match.FieldDataType) {
					candidates = append(candidates, match)
				}
			}
			return candidates
		}
	case telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextTrace:
		// forgiving context honored as-is: a real column wins (span.duration_nano -> col).
		if _, err := m.getColumn(ctx, 0, 0, field); err == nil {
			return []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(field.Name, field.FieldContext, field.FieldDataType)}
		}
	}

	// Metadata match by name, then the literal `{context}.{name}` spelling (a context can be
	// a legitimate prefix in user data, e.g. `metric.max_count`). For a forgiving context
	// this is the correction step (span.http.method -> attribute http.method).
	if matches := keys[field.Name]; len(matches) > 0 {
		return matches
	}
	if matches := keys[fmt.Sprintf("%s.%s", field.FieldContext.StringValue(), field.Name)]; len(matches) > 0 {
		return matches
	}

	// No metadata: synthesize per context.
	switch field.FieldContext {
	case telemetrytypes.FieldContextUnspecified:
		return append(querybuilder.SynthesizeKeys(field, value), synthScopeAttributeKey(field))
	case telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextTrace:
		// honored as-is: the stripped name lives in the attribute or scope attribute maps
		stripped := telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextUnspecified, field.FieldDataType)
		return append(querybuilder.SynthesizeKeys(stripped, value), synthScopeAttributeKey(stripped))
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource:
		// strict context honored as-is: stripped interpretation first, literal spelling second
		literal := telemetrytypes.NewTelemetryFieldKey(field.FieldContext.StringValue()+"."+field.Name, field.FieldContext, field.FieldDataType)
		return append(querybuilder.SynthesizeKeys(field, value), querybuilder.SynthesizeKeys(literal, value)...)
	case telemetrytypes.FieldContextScope:
		return []*telemetrytypes.TelemetryFieldKey{synthScopeAttributeKey(field)}
	}
	// contexts that don't exist on spans (log, body, …) have nothing to synthesize
	return nil
}

// synthScopeAttributeKey is the scope analog of querybuilder.SynthesizeKeys: for a name absent
// from metadata it guesses a scope attribute (`scope.attributes.<name>`). Only user attributes
// reach here — the declared scope paths are always in metadata, so they never need synthesizing.
func synthScopeAttributeKey(field *telemetrytypes.TelemetryFieldKey) *telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.NewTelemetryFieldKey(field.Name, telemetrytypes.FieldContextScope, telemetrytypes.FieldDataTypeString)
}

// isDeclaredScopePath reports whether a name is a scope field the schema declares as a top-level
// String path on the scope JSON column (scope.name, scope.version), as opposed to a user
// attribute under scope.attributes. Read straight from the intrinsic registry so the two stay
// in lockstep.
func isDeclaredScopePath(name string) bool {
	f, ok := IntrinsicFields[name]
	return ok && f.FieldContext == telemetrytypes.FieldContextScope
}

// scopeJSONExistsExpression renders the existence predicate for the scope JSON column — the one
// signal-specific case the generic querybuilder.ExistsExpression must not carry. Declared scope
// String paths are non-Nullable (absent reads '' not NULL) so they guard on ''; user scope
// attributes live under scope.attributes.<name> and guard on IS NOT NULL. ok is false for any
// non-scope column, so callers fall through to the generic expression.
func scopeJSONExistsExpression(columns []*schema.Column, key *telemetrytypes.TelemetryFieldKey, tsStart, tsEnd uint64, fieldExpression string, exists bool) (string, bool, error) {
	if key.FieldContext != telemetrytypes.FieldContextScope {
		return "", false, nil
	}
	newColumns, evolutionsEntries, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd)
	if err != nil {
		return "", false, err
	}
	if len(newColumns) != 1 || newColumns[0].Type.GetType() != schema.ColumnTypeEnumJSON {
		return "", false, nil
	}

	if isDeclaredScopePath(key.Name) {
		if exists {
			return fieldExpression + " <> ''", true, nil
		}
		return fieldExpression + " = ''", true, nil
	}

	columnName := newColumns[0].Name
	if len(evolutionsEntries) > 0 && evolutionsEntries[0] != nil {
		columnName = evolutionsEntries[0].ColumnName
	}
	path := fmt.Sprintf("%s.attributes.`%s`", columnName, key.Name)
	if exists {
		return path + " IS NOT NULL", true, nil
	}
	return path + " IS NULL", true, nil
}

func (m *fieldMapper) existsExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
	exists bool,
) (string, error) {
	columns, err := m.getColumn(ctx, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	fieldExpression, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	if expr, ok, err := scopeJSONExistsExpression(columns, key, tsStart, tsEnd, fieldExpression, exists); err != nil {
		return "", err
	} else if ok {
		return expr, nil
	}
	return querybuilder.ExistsExpression(columns, key, tsStart, tsEnd, fieldExpression, exists)
}
