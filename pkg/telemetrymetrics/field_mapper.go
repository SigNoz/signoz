package telemetrymetrics

import (
	"context"
	"fmt"
	"slices"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
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

func (m *fieldMapper) getColumn(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return []*schema.Column{timeSeriesV4Columns["labels"]}, nil
	case telemetrytypes.FieldContextMetric:
		col, ok := timeSeriesV4Columns[key.Name]
		if !ok {
			return []*schema.Column{}, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	case telemetrytypes.FieldContextUnspecified:
		col, ok := timeSeriesV4Columns[key.Name]
		if !ok {
			// if nothing is found, return labels column
			// as we keep all the labels in the labels column
			return []*schema.Column{timeSeriesV4Columns["labels"]}, nil
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *fieldMapper) FieldFor(ctx context.Context, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return fmt.Sprintf("JSONExtractString(%s, '%s')", columns[0].Name, key.Name), nil
	case telemetrytypes.FieldContextMetric:
		return columns[0].Name, nil
	case telemetrytypes.FieldContextUnspecified:
		if slices.Contains(IntrinsicFields, key.Name) {
			return columns[0].Name, nil
		}
		return fmt.Sprintf("JSONExtractString(%s, '%s')", columns[0].Name, key.Name), nil
	}

	return columns[0].Name, nil
}

func (m *fieldMapper) ColumnFor(ctx context.Context, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, tsStart, tsEnd, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	startNs, endNs uint64,
	field *telemetrytypes.TelemetryFieldKey,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	colName, err := m.FieldFor(ctx, startNs, endNs, field)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(colName), field.Name), nil
}
