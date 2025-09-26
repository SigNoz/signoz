package telemetrytraces

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
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

	// TODO(srikanthccv): remove this mapping
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

type defaultFieldMapper struct {
}

var _ qbtypes.FieldMapper = (*defaultFieldMapper)(nil)

func NewFieldMapper() *defaultFieldMapper {
	return &defaultFieldMapper{}
}

func (m *defaultFieldMapper) getColumn(
	_ context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return indexV3Columns["resource"], nil
	case telemetrytypes.FieldContextScope:
		return nil, qbtypes.ErrColumnNotFound
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return indexV3Columns["attributes_string"], nil
		case telemetrytypes.FieldDataTypeInt64,
			telemetrytypes.FieldDataTypeFloat64,
			telemetrytypes.FieldDataTypeNumber:
			return indexV3Columns["attributes_number"], nil
		case telemetrytypes.FieldDataTypeBool:
			return indexV3Columns["attributes_bool"], nil
		}
	case telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextUnspecified:
		// Check if this is a span scope field
		if strings.ToLower(key.Name) == SpanSearchScopeRoot || strings.ToLower(key.Name) == SpanSearchScopeEntryPoint {
			// The actual SQL will be generated in the condition builder
			return &schema.Column{Name: key.Name, Type: schema.ColumnTypeBool}, nil
		}

		// TODO(srikanthccv): remove this when it's safe to remove
		// issue with CH aliasing
		if _, ok := CalculatedFieldsDeprecated[key.Name]; ok {
			return indexV3Columns[oldToNew[key.Name]], nil
		}
		if _, ok := IntrinsicFieldsDeprecated[key.Name]; ok {
			return indexV3Columns[oldToNew[key.Name]], nil
		}

		if col, ok := indexV3Columns[key.Name]; ok {
			return col, nil
		}
		return nil, qbtypes.ErrColumnNotFound
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *defaultFieldMapper) ColumnFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (*schema.Column, error) {
	return m.getColumn(ctx, key)
}

// FieldFor returns the table field name for the given key if it exists
// otherwise it returns qbtypes.ErrColumnNotFound
func (m *defaultFieldMapper) FieldFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (string, error) {
	// Special handling for span scope fields
	if key.FieldContext == telemetrytypes.FieldContextSpan &&
		(strings.ToLower(key.Name) == SpanSearchScopeRoot || strings.ToLower(key.Name) == SpanSearchScopeEntryPoint) {
		// Return the field name as-is, the condition builder will handle the SQL generation
		return key.Name, nil
	}

	column, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type {
	case schema.JSONColumnType{}:
		// json is only supported for resource context as of now
		if key.FieldContext != telemetrytypes.FieldContextResource {
			return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource context fields are supported for json columns, got %s", key.FieldContext.String)
		}
		oldColumn := indexV3Columns["resources_string"]
		oldKeyName := fmt.Sprintf("%s['%s']", oldColumn.Name, key.Name)
		// have to add ::string as clickHouse throws an error :- data types Variant/Dynamic are not allowed in GROUP BY
		// once clickHouse dependency is updated, we need to check if we can remove it.
		if key.Materialized {
			oldKeyName = telemetrytypes.FieldKeyToMaterializedColumnName(key)
			oldKeyNameExists := telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
			return fmt.Sprintf("multiIf(%s.`%s` IS NOT NULL, %s.`%s`::String, %s==true, %s, NULL)", column.Name, key.Name, column.Name, key.Name, oldKeyNameExists, oldKeyName), nil
		} else {
			return fmt.Sprintf("multiIf(%s.`%s` IS NOT NULL, %s.`%s`::String, mapContains(%s, '%s'), %s, NULL)", column.Name, key.Name, column.Name, key.Name, oldColumn.Name, key.Name, oldKeyName), nil
		}

	case schema.ColumnTypeString,
		schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		schema.ColumnTypeUInt64,
		schema.ColumnTypeUInt32,
		schema.ColumnTypeInt8,
		schema.ColumnTypeInt16,
		schema.ColumnTypeBool,
		schema.DateTime64ColumnType{Precision: 9, Timezone: "UTC"},
		schema.FixedStringColumnType{Length: 32}:
		return column.Name, nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeFloat64,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeBool,
	}:
		// a key could have been materialized, if so return the materialized column name
		if key.Materialized {
			return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
		}
		return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
	}
	// should not reach here
	return column.Name, nil
}

// ColumnExpressionFor returns the column expression for the given field
// if it exists otherwise it returns qbtypes.ErrColumnNotFound
func (m *defaultFieldMapper) ColumnExpressionFor(
	ctx context.Context,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	colName, err := m.FieldFor(ctx, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		// we try to use the context we know of
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			// is it a static field?
			if _, ok := indexV3Columns[field.Name]; ok {
				// if it is, attach the column name directly
				field.FieldContext = telemetrytypes.FieldContextSpan
				colName, _ = m.FieldFor(ctx, field)
			} else {
				// - the context is not provided
				// - there are not keys for the field
				// - it is not a static field
				// - the next best thing to do is see if there is a typo
				// and suggest a correction
				correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
				if found {
					// we found a close match, in the error message send the suggestion
					return "", errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
				} else {
					// not even a close match, return an error
					return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
				}
			}
		} else if len(keysForField) == 1 {
			// we have a single key for the field, use it
			colName, _ = m.FieldFor(ctx, keysForField[0])
		} else {
			// select any non-empty value from the keys
			args := []string{}
			for _, key := range keysForField {
				colName, _ = m.FieldFor(ctx, key)
				args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", colName, colName))
			}
			colName = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}
