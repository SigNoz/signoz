package telemetryspans

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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
)

// interface check
var _ qbtypes.ClickhouseConditionBuilder = &conditionBuilder{}

type conditionBuilder struct {
}

func NewConditionBuilder() qbtypes.ClickhouseConditionBuilder {
	return &conditionBuilder{}
}

func (c *conditionBuilder) GetColumn(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return indexV3Columns["resources_string"], nil
	case telemetrytypes.FieldContextScope:
		// we don't have scope data stored in the spans yet
		return nil, qbtypes.ErrColumnNotFound
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return indexV3Columns["attributes_string"], nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return indexV3Columns["attributes_number"], nil
		case telemetrytypes.FieldDataTypeBool:
			return indexV3Columns["attributes_bool"], nil
		}
	case telemetrytypes.FieldContextSpan:
		col, ok := indexV3Columns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return col, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (c *conditionBuilder) GetTableFieldName(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type {
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

func (c *conditionBuilder) GetCondition(
	ctx context.Context,
	key telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	column, err := c.GetColumn(ctx, key)
	if err != nil {
		return "", err
	}

	tblFieldName, err := c.GetTableFieldName(ctx, key)
	if err != nil {
		return "", err
	}

	tblFieldName, value = telemetrytypes.DataTypeCollisionHandledFieldName(key, value, tblFieldName)

	// regular operators
	switch operator {
	// regular operators
	case qbtypes.FilterOperatorEqual:
		return sb.E(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(tblFieldName, value), nil

	// like and not like
	case qbtypes.FilterOperatorLike:
		return sb.Like(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(tblFieldName, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(tblFieldName, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(tblFieldName, value), nil

	case qbtypes.FilterOperatorRegexp:
		exp := fmt.Sprintf(`match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(exp), nil
	case qbtypes.FilterOperatorNotRegexp:
		exp := fmt.Sprintf(`not match(%s, %s)`, tblFieldName, sb.Var(value))
		return sb.And(exp), nil

	// between and not between
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(tblFieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(tblFieldName, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.In(tblFieldName, values...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.NotIn(tblFieldName, values...), nil

	// exists and not exists
	// in the query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		var value any
		switch column.Type {
		case schema.ColumnTypeString,
			schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			schema.FixedStringColumnType{Length: 32},
			schema.DateTime64ColumnType{Precision: 9, Timezone: "UTC"}:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.ColumnTypeUInt64,
			schema.ColumnTypeUInt32,
			schema.ColumnTypeUInt8,
			schema.ColumnTypeInt8,
			schema.ColumnTypeInt16,
			schema.ColumnTypeBool:
			value = 0
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(tblFieldName, value), nil
			} else {
				return sb.E(tblFieldName, value), nil
			}
		case schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}, schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeBool,
		}, schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeFloat64,
		}:
			leftOperand := fmt.Sprintf("mapContains(%s, '%s')", column.Name, key.Name)
			if key.Materialized {
				leftOperand = telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
			}
			if operator == qbtypes.FilterOperatorExists {
				return sb.E(leftOperand, true), nil
			} else {
				return sb.NE(leftOperand, true), nil
			}
		default:
			return "", fmt.Errorf("exists operator is not supported for column type %s", column.Type)
		}
	}
	return "", nil
}
