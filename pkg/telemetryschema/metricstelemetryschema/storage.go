package metricstelemetryschema

import (
	"context"
	"fmt"
	"slices"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/querybuilder"
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

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() qbtypes.Storage {
	return &storage{}
}

func (m *storage) getColumn(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {

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

func (m *storage) read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return "", err
	}

	switch key.FieldContext {
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope, telemetrytypes.FieldContextAttribute:
		return fmt.Sprintf("JSONExtractString(%s, %s)", columns[0].Name, clickhousesql.StringLiteral(key.Name)), nil
	case telemetrytypes.FieldContextMetric:
		return columns[0].Name, nil
	case telemetrytypes.FieldContextUnspecified:
		if slices.Contains(IntrinsicFields, key.Name) {
			return columns[0].Name, nil
		}
		return fmt.Sprintf("JSONExtractString(%s, %s)", columns[0].Name, clickhousesql.StringLiteral(key.Name)), nil
	}

	return columns[0].Name, nil
}

// Read composes the bare read of one key with its membership test. An
// intrinsic column is always present. A label is checked for key membership;
// absent, it reads the empty string, and that is the metrics keyless
// contract, so no query guards it. Every read keeps its native type: a label
// already reads back as String, and coercion adds nothing.
func (m *storage) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (qbtypes.Read, error) {
	sql, err := m.read(ctx, q, key)
	if err != nil {
		return qbtypes.Read{}, err
	}
	if slices.Contains(IntrinsicFields, key.Name) {
		return qbtypes.Read{SQL: sql, Presence: "true", Absence: "false", WhenAbsent: qbtypes.AlwaysPresent, KeepType: true}, nil
	}
	presence := fmt.Sprintf("has(JSONExtractKeys(labels), %s)", clickhousesql.StringLiteral(key.Name))
	return qbtypes.Read{
		SQL:        sql,
		Presence:   presence,
		Absence:    "not " + presence,
		WhenAbsent: qbtypes.AbsentIsValue,
		KeepType:   true,
	}, nil
}

// Fallback answers every name: a column name is the column, any other name
// is a label, and a context-qualified name is also the label spelled with
// its context, because a context can be a legitimate prefix in user data.
func (m *storage) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) ([]*telemetrytypes.LogicalField, error) {
	if column, isColumn := timeSeriesV4Columns[key.Name]; isColumn {
		dataType := key.FieldDataType
		if dataType == telemetrytypes.FieldDataTypeUnspecified {
			dataType = querybuilder.ColumnDataType(column)
		}
		return querybuilder.WrapAsLogicalFields(key.Name, []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, dataType)}), nil
	}
	keys := []*telemetrytypes.TelemetryFieldKey{
		telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextAttribute, key.FieldDataType),
	}
	if key.FieldContext != telemetrytypes.FieldContextUnspecified {
		keys = append(keys, telemetrytypes.NewTelemetryFieldKey(
			key.FieldContext.StringValue()+"."+key.Name, telemetrytypes.FieldContextAttribute, key.FieldDataType))
	}
	return querybuilder.WrapAsLogicalFields(key.Name, keys), nil
}

// Traits: every context addresses the one label bag, so a key under any
// context resolves as if it had none.
func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{
		OwnContexts: []telemetrytypes.FieldContext{
			telemetrytypes.FieldContextResource,
			telemetrytypes.FieldContextScope,
			telemetrytypes.FieldContextAttribute,
			telemetrytypes.FieldContextMetric,
		},
	}
}
