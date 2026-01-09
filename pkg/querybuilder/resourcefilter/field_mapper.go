package resourcefilter

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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
	_, _ uint64,
	key *telemetrytypes.TelemetryFieldKey,
) ([]*schema.Column, error) {
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return []*schema.Column{resourceColumns["labels"]}, nil
	}
	if col, ok := resourceColumns[key.Name]; ok {
		return []*schema.Column{col}, nil
	}
	return nil, qbtypes.ErrColumnNotFound
}

func (m *defaultFieldMapper) ColumnFor(
	ctx context.Context,
	_ valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
) ([]*schema.Column, error) {
	return m.getColumn(ctx, tsStart, tsEnd, key)
}

func (m *defaultFieldMapper) FieldFor(
	ctx context.Context,
	_ valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
) (string, error) {
	columns, err := m.getColumn(ctx, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return fmt.Sprintf("simpleJSONExtractString(%s, '%s')", columns[0].Name, key.Name), nil
	}
	return columns[0].Name, nil
}

func (m *defaultFieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	colName, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s AS `%s`", colName, key.Name), nil
}
