package metricstelemetryschema

import (
	"context"
	"fmt"
	"slices"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/semconv"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func metricAttributeMembers(key *telemetrytypes.TelemetryFieldKey) []string {
	if key.FieldContext != telemetrytypes.FieldContextResource &&
		key.FieldContext != telemetrytypes.FieldContextScope &&
		key.FieldContext != telemetrytypes.FieldContextAttribute &&
		key.FieldContext != telemetrytypes.FieldContextUnspecified {
		return []string{key.Name}
	}
	if len(key.SemconvMembers) > 0 {
		return key.SemconvMembers
	}
	return semconv.AttributeMembers(telemetrytypes.FieldKeySelector{
		Name:         key.Name,
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: key.FieldContext,
	})
}

// CandidateKeys returns nil: metrics has no attribute-map fallback, so a context-missing
// key stays unresolved and the caller errors.
func (m *fieldMapper) CandidateKeys(_ context.Context, _ valuer.UUID, _ *telemetrytypes.TelemetryFieldKey, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return nil
}

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

func (m *fieldMapper) FieldFor(ctx context.Context, _ valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return metricLabelExpression(columns[0].Name, metricAttributeMembers(key)), nil
	case telemetrytypes.FieldContextMetric:
		return columns[0].Name, nil
	case telemetrytypes.FieldContextUnspecified:
		if slices.Contains(IntrinsicFields, key.Name) {
			return columns[0].Name, nil
		}
		return metricLabelExpression(columns[0].Name, metricAttributeMembers(key)), nil
	}

	return columns[0].Name, nil
}

func metricLabelExpression(columnName string, members []string) string {
	if len(members) == 1 {
		return fmt.Sprintf("JSONExtractString(%s, '%s')", columnName, members[0])
	}
	values := make([]string, 0, len(members))
	for _, member := range members {
		values = append(values, fmt.Sprintf("NULLIF(JSONExtractString(%s, '%s'), '')", columnName, member))
	}
	return "COALESCE(" + strings.Join(values, ", ") + ", '')"
}

func (m *fieldMapper) ColumnFor(ctx context.Context, _ valuer.UUID, tsStart, tsEnd uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, tsStart, tsEnd, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	field *telemetrytypes.TelemetryFieldKey,
	_ telemetrytypes.FieldDataType,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {

	fieldExpression, err := m.FieldFor(ctx, orgID, startNs, endNs, field)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(fieldExpression), field.Name), nil
}
