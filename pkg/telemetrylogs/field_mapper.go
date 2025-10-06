package telemetrylogs

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
	logsV2Columns = map[string]*schema.Column{
		"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
		"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

		"timestamp":          {Name: "timestamp", Type: schema.ColumnTypeUInt64},
		"observed_timestamp": {Name: "observed_timestamp", Type: schema.ColumnTypeUInt64},
		"id":                 {Name: "id", Type: schema.ColumnTypeString},
		"trace_id":           {Name: "trace_id", Type: schema.ColumnTypeString},
		"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
		"trace_flags":        {Name: "trace_flags", Type: schema.ColumnTypeUInt32},
		"severity_text":      {Name: "severity_text", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"severity_number":    {Name: "severity_number", Type: schema.ColumnTypeUInt8},
		"body":               {Name: "body", Type: schema.ColumnTypeString},
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
		"resource":      {Name: "resource", Type: schema.JSONColumnType{}},
		"scope_name":    {Name: "scope_name", Type: schema.ColumnTypeString},
		"scope_version": {Name: "scope_version", Type: schema.ColumnTypeString},
		"scope_string": {Name: "scope_string", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

type fieldMapper struct {
}

func NewFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return logsV2Columns["resource"], nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return logsV2Columns["scope_name"], nil
		case "version", "scope.version", "scope_version":
			return logsV2Columns["scope_version"], nil
		}
		return logsV2Columns["scope_string"], nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return logsV2Columns["attributes_string"], nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return logsV2Columns["attributes_number"], nil
		case telemetrytypes.FieldDataTypeBool:
			return logsV2Columns["attributes_bool"], nil
		}
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			// check if the key has body JSON search
			if strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
				return logsV2Columns["body"], nil
			}
			return nil, qbtypes.ErrColumnNotFound
		}
		return col, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
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
		oldColumn := logsV2Columns["resources_string"]
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
		schema.ColumnTypeUInt8:
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

func (m *fieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *fieldMapper) ColumnExpressionFor(
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
			if _, ok := logsV2Columns[field.Name]; ok {
				// if it is, attach the column name directly
				field.FieldContext = telemetrytypes.FieldContextLog
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
