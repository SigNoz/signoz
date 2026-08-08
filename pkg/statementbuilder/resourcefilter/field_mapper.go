package resourcefilter

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/semconv"
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

// CandidateKeys returns nil: the resource filter has no attribute-map fallback, so a
// context-missing key stays unresolved and the caller errors.
func (m *defaultFieldMapper) CandidateKeys(_ context.Context, _ valuer.UUID, _ *telemetrytypes.TelemetryFieldKey, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return nil
}

func NewFieldMapper() *defaultFieldMapper {
	return &defaultFieldMapper{}
}

func resourceSemconvMembers(key *telemetrytypes.TelemetryFieldKey) []string {
	if key.Signal != telemetrytypes.SignalTraces || key.FieldContext != telemetrytypes.FieldContextResource {
		return []string{key.Name}
	}
	if len(key.SemconvMembers) > 0 {
		return key.SemconvMembers
	}
	return semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{
		Name:         key.Name,
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	})
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
		members := resourceSemconvMembers(key)
		if len(members) > 1 {
			values := make([]string, 0, len(members))
			for _, member := range members {
				values = append(values, fmt.Sprintf("NULLIF(simpleJSONExtractString(%s, %s), '')", columns[0].Name, querybuilder.ClickHouseStringLiteral(member)))
			}
			return "COALESCE(" + strings.Join(values, ", ") + ", '')", nil
		}
		return fmt.Sprintf("simpleJSONExtractString(%s, %s)", columns[0].Name, querybuilder.ClickHouseStringLiteral(members[0])), nil
	}
	return columns[0].Name, nil
}

func (m *defaultFieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	key *telemetrytypes.TelemetryFieldKey,
	_ telemetrytypes.FieldDataType,
	_ map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	fieldExpression, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, key)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s AS `%s`", fieldExpression, key.Name), nil
}
