package telemetrymetrics

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	timeSeriesV4Columns = map[string]*schema.Column{
		"temporality":  {Name: "temporality", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"metric_name":  {Name: "metric_name", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"type":         {Name: "type", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
		"is_monotonic": {Name: "is_monotonic", Type: schema.ColumnTypeBool},
		"fingerprint":  {Name: "fingerprint", Type: schema.ColumnTypeUInt64},
		"unix_milli":   {Name: "unix_milli", Type: schema.ColumnTypeInt64},
		"labels":       {Name: "labels", Type: schema.ColumnTypeString},
		"attrs": {Name: "attrs", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"scope_attrs": {Name: "scope_attrs", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"resource_attrs": {Name: "resource_attrs", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

type fieldMapper struct{}

func NewFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return timeSeriesV4Columns["labels"], nil
	case telemetrytypes.FieldContextMetric, telemetrytypes.FieldContextUnspecified:
		col, ok := timeSeriesV4Columns[key.Name]
		if !ok {
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

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return fmt.Sprintf("JSONExtractString(%s, '%s')", column.Name, key.Name), nil
	case telemetrytypes.FieldContextMetric:
		return column.Name, nil
	}

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
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s AS `%s`", colName, field.Name), nil
}
