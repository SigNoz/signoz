package telemetrymetadata

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	attributeMetadataColumns = map[string]*schema.Column{
		"resource_attributes": {Name: "resource_attributes", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
		"attributes": {Name: "attributes", Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		}},
	}
)

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{attributeMetadataColumns["resource_attributes"]}, nil
	case telemetrytypes.FieldContextAttribute:
		return []*schema.Column{attributeMetadataColumns["attributes"]}, nil
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *storage) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return "", err
	}

	switch columns[0].Type {
	case schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}:
		return fmt.Sprintf("%s['%s']", columns[0].Name, key.Name), nil
	}
	return columns[0].Name, nil
}

func (m *storage) Exists(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	columns, err := m.getColumn(ctx, q.StartNs, q.EndNs, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	predicate := fmt.Sprintf("mapContains(%s, '%s')", columns[0].Name, key.Name)
	if !exists {
		predicate = "NOT " + predicate
	}
	return qbtypes.Existence{Predicate: predicate, WhenAbsent: qbtypes.AbsentIsSentinel}, nil
}

// Fallback returns nil: the metadata tables have no attribute synthesis, so
// a key metadata does not hold yields no condition.
func (m *storage) Fallback(context.Context, qbtypes.QueryInfo, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) ([]*telemetrytypes.LogicalField, error) {
	return nil, nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{UnknownKey: qbtypes.IgnoreUnknownKey}
}

func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return querybuilder.DefaultRead(ctx, q, m, logical)
}
