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
	"github.com/huandu/go-sqlbuilder"
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

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(
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

// resolveColumnExprs resolves key to its per-column value expressions and existence guards
// (after evolution selection); existExprs only carries guards for guardable column types.
func (m *storage) resolveColumnExprs(
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
				if f, ok := IntrinsicFields[key.Name]; ok && f.FieldContext == telemetrytypes.FieldContextScope {
					// declared String paths on the scope column read '' for the missing case
					exprs = append(exprs, fmt.Sprintf("%s::String", key.Name))
					existExprs = append(existExprs, fmt.Sprintf("%s <> ''", key.Name))
				} else {
					attributeName := strings.TrimPrefix(key.Name, "attribute.") // literal "attribute" prefix in attribute keys needs double prefix
					exprs = append(exprs, fmt.Sprintf("%s.attributes.%s::String", columnName, querybuilder.ClickHouseIdentifier(attributeName)))
					existExprs = append(existExprs, fmt.Sprintf("%s.attributes.%s IS NOT NULL", columnName, querybuilder.ClickHouseIdentifier(attributeName)))
				}
			default:
				return nil, nil, nil, errors.NewInternalf(errors.CodeInternal, "only resource and scope context fields are supported for json columns, got %s", key.FieldContext.String)
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

// logicalIsTemporal reports whether the logical field resolves to a single time
// column. A family is attribute-backed and never temporal.
func (m *storage) logicalIsTemporal(ctx context.Context, startNs, endNs uint64, logical *telemetrytypes.LogicalField) (bool, error) {
	if logical.IsFamily() {
		return false, nil
	}
	return m.columnIsTemporal(ctx, startNs, endNs, logical.Single())
}

// columnIsTemporal reports whether key resolves to a single time column, after evolution
// selection. Multiple columns mean an attribute-map union, which is never temporal.
func (m *storage) columnIsTemporal(ctx context.Context, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (bool, error) {
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

// scopeJSONExistsExpression renders the existence predicate for the scope JSON column, the one
// signal-specific case the generic querybuilder.ExistsExpression must not carry.
func scopeJSONExistsExpression(key *telemetrytypes.TelemetryFieldKey, fieldExpression string, exists bool) (string, bool) {
	if key.FieldContext != telemetrytypes.FieldContextScope {
		return "", false
	}
	// Declared String paths are non-Nullable (absent reads '' not NULL).
	if f, ok := IntrinsicFields[key.Name]; ok && f.FieldContext == telemetrytypes.FieldContextScope {
		if exists {
			return fieldExpression + " <> ''", true
		}
		return fieldExpression + " = ''", true
	}
	// Scope attribute: the value expression casts the JSON path to String, which folds a missing
	// key's NULL to '', so presence must test the raw path — drop the ::String cast.
	path := strings.TrimSuffix(fieldExpression, "::String")
	if exists {
		return path + " IS NOT NULL", true
	}
	return path + " IS NULL", true
}

// Read returns the bare read of one field key. A span scope key has no column; it
// compiles to a structural predicate, so its read is its name.
func (m *storage) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	if isSpanScopeField(key.Name) {
		return key.Name, nil
	}

	exprs, existExpr, columns, err := m.resolveColumnExprs(ctx, q.StartNs, q.EndNs, key)
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

func (m *storage) Exists(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	if isSpanScopeField(key.Name) {
		return qbtypes.Existence{Predicate: "true", WhenAbsent: qbtypes.AlwaysPresent}, nil
	}
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	fieldExpression, err := m.Read(ctx, q, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	whenAbsent, err := absentReads(q, key, columns)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	if expr, ok := scopeJSONExistsExpression(key, fieldExpression, exists); ok {
		return qbtypes.Existence{Predicate: expr, WhenAbsent: whenAbsent}, nil
	}
	predicate, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, fieldExpression, exists)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	return qbtypes.Existence{Predicate: predicate, WhenAbsent: whenAbsent}, nil
}

// absentReads tells what a row without the key reads: NULL from a multi-era
// read, the empty value from a map or from a JSON path (its ::String cast
// folds NULL to the empty string), and a real value from every other column.
func absentReads(q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, columns []*schema.Column) (qbtypes.Absent, error) {
	newColumns, _, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, q.StartNs, q.EndNs)
	if err != nil {
		return qbtypes.AlwaysPresent, err
	}
	if len(newColumns) > 1 {
		return qbtypes.AbsentIsNull, nil
	}
	if len(newColumns) == 0 {
		return qbtypes.AlwaysPresent, nil
	}
	switch newColumns[0].Type.GetType() {
	case schema.ColumnTypeEnumMap, schema.ColumnTypeEnumJSON:
		return qbtypes.AbsentIsSentinel, nil
	}
	return qbtypes.AlwaysPresent, nil
}

// Fallback answers a key metadata does not report. A bare key that names
// a real column is that column; a forgiving span or trace context is honored
// as-is and corrects to the attribute maps when it names no column; a strict
// context synthesizes its type variants under the stripped and the literal
// spelling.
func (m *storage) Fallback(ctx context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, value any) ([]*telemetrytypes.LogicalField, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	switch key.FieldContext {
	case telemetrytypes.FieldContextUnspecified:
		probe := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextSpan, key.FieldDataType)
		if _, err := m.getColumn(ctx, 0, 0, probe); err == nil {
			keys = []*telemetrytypes.TelemetryFieldKey{probe}
		} else {
			keys = querybuilder.SynthesizeKeys(key, value)
		}
	case telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextTrace:
		if _, err := m.getColumn(ctx, 0, 0, key); err == nil {
			keys = []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)}
		} else {
			// the stripped name lives in the attribute maps
			stripped := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextUnspecified, key.FieldDataType)
			keys = querybuilder.SynthesizeKeys(stripped, value)
		}
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope:
		// a context can be a legitimate prefix in user data
		literal := telemetrytypes.NewTelemetryFieldKey(key.FieldContext.StringValue()+"."+key.Name, key.FieldContext, key.FieldDataType)
		keys = append(querybuilder.SynthesizeKeys(key, value), querybuilder.SynthesizeKeys(literal, value)...)
	}
	return querybuilder.WrapAsLogicalFields(key.Name, keys), nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{
		Split:       qbtypes.MainOfSplit,
		OwnContexts: []telemetrytypes.FieldContext{telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextTrace},
	}
}

// Compile keeps the two trace-specific rules ahead of the shared condition:
// a span scope key compiles to a structural predicate, and a duration
// operand accepts duration syntax.
func (m *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	if isSpanScopeField(logical.Name) {
		condition, err := buildSpanScopeCondition(logical.Single(), operator, value, q.StartNs)
		if err != nil {
			return qbtypes.Compiled{}, err
		}
		return qbtypes.Compiled{Condition: condition}, nil
	}
	// TODO(srikanthccv): maybe extend this to every possible attribute
	if logical.Name == "duration_nano" || logical.Name == "durationNano" { // QoL improvement
		coerced, err := coerceDurationValue(value)
		if err != nil {
			return qbtypes.Compiled{}, err
		}
		value = coerced
	}
	return querybuilder.SharedCondition(ctx, q, m, logical, operator, value, sb)
}

// ColumnRead keeps a time column in its native type; coercing it would
// yield seconds.
func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	read, err := querybuilder.DefaultRead(ctx, q, m, logical)
	if err != nil {
		return qbtypes.ColumnExpr{}, err
	}
	temporal, err := m.logicalIsTemporal(ctx, q.StartNs, q.EndNs, logical)
	if err != nil {
		return qbtypes.ColumnExpr{}, err
	}
	read.KeepType = temporal
	return read, nil
}
