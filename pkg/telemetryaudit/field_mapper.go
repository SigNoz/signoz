package telemetryaudit

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

var logsV2Columns = map[string]*schema.Column{
	"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
	"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

	"timestamp":          {Name: "timestamp", Type: schema.ColumnTypeUInt64},
	"observed_timestamp": {Name: "observed_timestamp", Type: schema.ColumnTypeUInt64},
	"id":                 {Name: "id", Type: schema.ColumnTypeString},
	"trace_id":           {Name: "trace_id", Type: schema.ColumnTypeString},
	"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
	"trace_flags":        {Name: "trace_flags", Type: schema.ColumnTypeUInt32},
	"severity_text": {Name: "severity_text", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
	"severity_number": {Name: "severity_number", Type: schema.ColumnTypeUInt8},
	"body":              {Name: "body", Type: schema.ColumnTypeString},
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

type fieldMapper struct{}

func NewFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{logsV2Columns["resources_string"], logsV2Columns["resource"]}, nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return []*schema.Column{logsV2Columns["scope_name"]}, nil
		case "version", "scope.version", "scope_version":
			return []*schema.Column{logsV2Columns["scope_version"]}, nil
		}
		return []*schema.Column{logsV2Columns["scope_string"]}, nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return []*schema.Column{logsV2Columns["attributes_string"]}, nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return []*schema.Column{logsV2Columns["attributes_number"]}, nil
		case telemetrytypes.FieldDataTypeBool:
			return []*schema.Column{logsV2Columns["attributes_bool"]}, nil
		}
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := logsV2Columns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) FieldFor(ctx context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}

	exprs := []string{}
	existExpr := []string{}
	for _, column := range columns {
		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			if key.FieldContext == telemetrytypes.FieldContextResource {
				exprs = append(exprs, fmt.Sprintf("%s.`%s`::String", column.Name, key.Name))
				existExpr = append(existExpr, fmt.Sprintf("%s.`%s` IS NOT NULL", column.Name, key.Name))
			} else {
				return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only resource context fields are supported for json columns in audit, got %s", key.FieldContext.String)
			}
		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				exprs = append(exprs, column.Name)
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported low cardinality element type %s", elementType)
			}
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
			exprs = append(exprs, column.Name)
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
				if key.Materialized {
					exprs = append(exprs, telemetrytypes.FieldKeyToMaterializedColumnName(key))
					existExpr = append(existExpr, fmt.Sprintf("%s==true", telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)))
				} else {
					exprs = append(exprs, fmt.Sprintf("%s['%s']", column.Name, key.Name))
					existExpr = append(existExpr, fmt.Sprintf("mapContains(%s, '%s')", column.Name, key.Name))
				}
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported map value type %s", valueType)
			}
		}
	}

	if len(exprs) == 1 {
		return exprs[0], nil
	} else if len(exprs) > 1 {
		if len(existExpr) != len(exprs) {
			return "", errors.New(errors.TypeInternal, errors.CodeInternal, "length of exist exprs doesn't match to that of exprs")
		}
		finalExprs := []string{}
		for i, expr := range exprs {
			finalExprs = append(finalExprs, fmt.Sprintf("%s, %s", existExpr[i], expr))
		}
		return "multiIf(" + strings.Join(finalExprs, ", ") + ", NULL)", nil
	}

	return columns[0].Name, nil
}

func (m *fieldMapper) ColumnFor(ctx context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	tsStart, tsEnd uint64,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	fieldExpression, err := m.FieldFor(ctx, tsStart, tsEnd, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			if _, ok := logsV2Columns[field.Name]; ok {
				field.FieldContext = telemetrytypes.FieldContextLog
				fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, field)
			} else {
				correction, found := telemetrytypes.SuggestCorrection(field.Name, maps.Keys(keys))
				if found {
					return "", errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, correction)
				}
				return "", errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name)
			}
		} else if len(keysForField) == 1 {
			fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, keysForField[0])
		} else {
			args := []string{}
			for _, key := range keysForField {
				fieldExpression, _ = m.FieldFor(ctx, tsStart, tsEnd, key)
				args = append(args, fmt.Sprintf("toString(%s) != '', toString(%s)", fieldExpression, fieldExpression))
			}
			fieldExpression = fmt.Sprintf("multiIf(%s, NULL)", strings.Join(args, ", "))
		}
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(fieldExpression), field.Name), nil
}
