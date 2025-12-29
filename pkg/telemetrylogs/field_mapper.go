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
	case telemetrytypes.FieldContextBody:
		// body context fields are stored in the body column
		return logsV2Columns["body"], nil
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			// check if the key has body JSON search (backward compatibility)
			if strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
				return logsV2Columns["body"], nil
			}
			return nil, qbtypes.ErrColumnNotFound
		}
		return col, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

// FieldFor returns the column expression for a given TelemetryFieldKey,
// Example: "attributes_string['http.method']"
//
// Both FieldContext and FieldDataType must be specified in the TelemetryFieldKey.
// Returns an error if the field cannot be resolved to a valid column expression.
func (m *fieldMapper) FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	column, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	switch column.Type.GetType() {
	case schema.ColumnTypeEnumJSON:
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
	case schema.ColumnTypeEnumLowCardinality:
		switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
		case schema.ColumnTypeEnumString:
			return column.Name, nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
		}
	case schema.ColumnTypeEnumString,
		schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
		return column.Name, nil
	case schema.ColumnTypeEnumMap:
		keyType := column.Type.(schema.MapColumnType).KeyType
		if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
		}

		switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
			// a key could have been materialized, if so return the materialized column name
			if key.Materialized {
				return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
			}
			return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
		}
	}
	// should not reach here
	return column.Name, nil
}

// ColumnFor returns the schema.Column metadata for a given TelemetryFieldKey.
//
// Both FieldContext and FieldDataType must be specified in the TelemetryFieldKey.
// Returns an error if the field cannot be resolved to a valid column.
func (m *fieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	return m.getColumn(ctx, key)
}

// ColumnExpressionFor returns an aliased expression for a given TelemetryFieldKey,
// Example: "attributes_string['http.method'] AS `http.method`".
//
// It handles cases where the field key lacks sufficient context by attempting to
// resolve the appropriate context from the provided keys map. If multiple contexts
// are found for the same field name, it constructs a multiIf expression to select
// the first non-empty value.
//
// This method is a wrapper over FieldFor to provide better error messages and aliasing.
//
// If no context is found, it returns an error optionally suggests a correction if a close match exists,
func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	populateMissingFieldContextAndDataType(keys, field)

	colName, err := m.FieldFor(ctx, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		// the key didn't have the right context to be added to the query
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			// no keys found for the field, suggest correction if possible
			correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
			if found {
				// we found a close match, in the error message send the suggestion
				return "", errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
			} else {
				// not even a close match, return an error
				return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
			}
		} else if len(keysForField) == 1 {
			// this should never be the case as this would be handled by populateMissingFieldContextAndDataType
		} else {
			// select any non-empty value from the keys
			args := []string{}
			for _, key := range keysForField {
				// check if either of context or data type matches
				if field.FieldContext != telemetrytypes.FieldContextUnspecified && key.FieldContext != field.FieldContext {
					continue
				}
				if field.FieldDataType != telemetrytypes.FieldDataTypeUnspecified && key.FieldDataType != field.FieldDataType {
					continue
				}

				if key.Materialized {
					colName = telemetrytypes.FieldKeyToMaterializedColumnName(key)
					colNameExists := telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
					if key.FieldDataType == telemetrytypes.FieldDataTypeBool {
						// For boolean materialized fields, we do not create exists column
						// So we use the same column name and check if it's true then only use the value
						colNameExists = colName
					}
					args = append(args, fmt.Sprintf("%s==true, %s", colNameExists, colName))
				}

				switch key.FieldContext {
				case telemetrytypes.FieldContextResource:
					args = append(args, fmt.Sprintf("%s.`%s` IS NOT NULL, %s.`%s`::String", LogsV2ResourceColumn, key.Name, LogsV2ResourceColumn, key.Name))
					args = append(args, fmt.Sprintf("mapContains(%s, '%s'), %s['%s']", LogsV2ResourcesStringColumn, key.Name, LogsV2ResourcesStringColumn, key.Name))
				case telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
					column, err := m.getColumn(ctx, key)
					// should not error out as we have created this key
					if err != nil {
						return "", errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, err.Error())
					}
					args = append(args, fmt.Sprintf("mapContains(%s, '%s'), %s['%s']", column.Name, key.Name, column.Name, key.Name))

				default:
					colName, err := m.FieldFor(ctx, key)
					// should not error out as we have created this key
					if err != nil {
						return "", errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, err.Error())
					}
					args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", colName, colName))
				}
			}
			if len(args) == 0 {
				return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
			}
			colName = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}

// populateMissingFieldContextAndDataType tries to populate missing FieldContext and FieldDataType from the keys map.
func populateMissingFieldContextAndDataType(keys map[string][]*telemetrytypes.TelemetryFieldKey, field *telemetrytypes.TelemetryFieldKey) {

	if field.FieldContext != telemetrytypes.FieldContextUnspecified && field.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		// both context and data type are specified, nothing to do
		return
	}
	keysForField := keys[field.Name]
	if len(keysForField) == 0 {
		// Check if it's a top level static field
		if key, ok := logsV2Columns[field.Name]; ok {
			// if it is, populate context and data type
			field.FieldContext = telemetrytypes.FieldContextLog
			// infer data type from column type
			switch key.Type {
			case schema.ColumnTypeString,
				schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
				schema.MapColumnType{
					KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
					ValueType: schema.ColumnTypeString,
				}:
				field.FieldDataType = telemetrytypes.FieldDataTypeString
			case schema.ColumnTypeUInt64,
				schema.ColumnTypeUInt32,
				schema.ColumnTypeUInt8,
				schema.MapColumnType{
					KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
					ValueType: schema.ColumnTypeFloat64,
				}:
				field.FieldDataType = telemetrytypes.FieldDataTypeNumber
			case schema.MapColumnType{
				KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
				ValueType: schema.ColumnTypeBool,
			}:
				field.FieldDataType = telemetrytypes.FieldDataTypeBool
			}
			return
		}
		// Check if it's a body JSON search
		if strings.HasPrefix(field.Name, BodyJSONStringSearchPrefix) {
			field.FieldContext = telemetrytypes.FieldContextLog
			field.FieldDataType = telemetrytypes.FieldDataTypeString
			return
		}
		// no keys for the field, nothing to do
		return
	} else if len(keysForField) == 1 {
		// we have a single key for the field, use it
		field.FieldContext = keysForField[0].FieldContext
		field.FieldDataType = keysForField[0].FieldDataType
	} else {
		// multiple keys found with same name,
		// filter out the ones which match the provided context or data type
		filteredKeysForField := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keysForField))
		for _, key := range keysForField {
			// 1. if both context and data type are unspecified, consider this key
			// 2. if context matches, consider this key
			// 3. if data type matches, consider this key
			if (field.FieldContext == telemetrytypes.FieldContextUnspecified && field.FieldDataType == telemetrytypes.FieldDataTypeUnspecified) ||
				key.FieldContext == field.FieldContext ||
				key.FieldDataType == field.FieldDataType {
				filteredKeysForField = append(filteredKeysForField, key)
			}
		}

		// if we have a single match, use it
		if len(filteredKeysForField) == 1 {
			field.FieldContext = filteredKeysForField[0].FieldContext
			field.FieldDataType = filteredKeysForField[0].FieldDataType
			return
		}
		// Should we give priority to top level fields here?
		// unable to disambiguate, for now leave as is
	}
}
