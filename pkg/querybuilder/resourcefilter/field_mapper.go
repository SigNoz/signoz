package resourcefilter

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	resourceColumns = map[string]*schema.Column{
		"labels":                  {Name: "labels", Type: schema.ColumnTypeString},
		"fingerprint":             {Name: "fingerprint", Type: schema.ColumnTypeString},
		"seen_at_ts_bucket_start": {Name: "seen_at_ts_bucket_start", Type: schema.ColumnTypeInt64},
	}
)

type defaultFieldMapper struct{}

var _ qbtypes.FieldMapper = (*defaultFieldMapper)(nil)

func NewFieldMapper() *defaultFieldMapper {
	return &defaultFieldMapper{}
}

func (m *defaultFieldMapper) getColumn(
	_ context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (*schema.Column, error) {
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return resourceColumns["labels"], nil
	}
	if col, ok := resourceColumns[key.Name]; ok {
		return col, nil
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *defaultFieldMapper) ColumnFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *defaultFieldMapper) FieldFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
) (string, error) {
	column, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return fmt.Sprintf("simpleJSONExtractString(%s, '%s')", column.Name, key.Name), nil
	}
	return column.Name, nil
}

func (m *defaultFieldMapper) ColumnExpressionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	colName, err := m.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s AS `%s`", colName, key.Name), nil
}
