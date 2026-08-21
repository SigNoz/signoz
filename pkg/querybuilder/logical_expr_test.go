package querybuilder

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubFieldMapper provides just the two per-key primitives the shared
// composition builds on; the remaining FieldMapper methods are unused here.
type stubFieldMapper struct{}

func (stubFieldMapper) FieldFor(_ context.Context, _ valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return "value(" + key.Name + ")", nil
}

func (stubFieldMapper) ExistsFor(_ context.Context, _ valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey, exists bool) (string, error) {
	if exists {
		return "has(" + key.Name + ")", nil
	}
	return "NOT has(" + key.Name + ")", nil
}

func (stubFieldMapper) ColumnFor(context.Context, valuer.UUID, uint64, uint64, *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return nil, qbtypes.ErrColumnNotFound
}

func (stubFieldMapper) ColumnExpressionFor(context.Context, valuer.UUID, uint64, uint64, *telemetrytypes.TelemetryFieldKey, telemetrytypes.FieldDataType, map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	return "", qbtypes.ErrColumnNotFound
}

func (stubFieldMapper) CandidateKeys(context.Context, valuer.UUID, *telemetrytypes.TelemetryFieldKey, any, map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return nil
}

func stringFamily(names ...string) *telemetrytypes.LogicalField {
	members := make([]*telemetrytypes.TelemetryFieldKey, 0, len(names))
	for _, name := range names {
		members = append(members, &telemetrytypes.TelemetryFieldKey{Name: name, FieldDataType: telemetrytypes.FieldDataTypeString})
	}
	return &telemetrytypes.LogicalField{Name: names[0], FieldDataType: telemetrytypes.FieldDataTypeString, Members: members}
}

func TestLogicalValueExprSingleMemberDelegatesToFieldFor(t *testing.T) {
	logical := telemetrytypes.SingleLogicalField("a", &telemetrytypes.TelemetryFieldKey{Name: "a"})
	expr, err := LogicalValueExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "value(a)", expr)
}

func TestLogicalValueExprStringFamilyMergesCurrentFirst(t *testing.T) {
	expr, err := LogicalValueExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, stringFamily("current", "old"))
	require.NoError(t, err)
	// The trailing '' preserves keyless-row semantics for negative operators.
	assert.Equal(t, "COALESCE(NULLIF(value(current), ''), NULLIF(value(old), ''), '')", expr)
}

func TestLogicalValueExprNumericFamilyGuardsEveryMember(t *testing.T) {
	logical := &telemetrytypes.LogicalField{
		Name:          "current",
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
		Members: []*telemetrytypes.TelemetryFieldKey{
			{Name: "current", FieldDataType: telemetrytypes.FieldDataTypeNumber},
			{Name: "old", FieldDataType: telemetrytypes.FieldDataTypeNumber},
		},
	}
	expr, err := LogicalValueExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, logical)
	require.NoError(t, err)
	// The 0 tail mirrors the '' tail of the string branch: numeric maps read 0
	// for an absent key, so keyless rows keep single-key semantics.
	assert.Equal(t, "multiIf(has(current), value(current), has(old), value(old), 0)", expr)
}

func TestLogicalValueExprBoolFamilyReadsFalseForKeylessRows(t *testing.T) {
	logical := &telemetrytypes.LogicalField{
		Name:          "flag",
		FieldDataType: telemetrytypes.FieldDataTypeBool,
		Members: []*telemetrytypes.TelemetryFieldKey{
			{Name: "current", FieldDataType: telemetrytypes.FieldDataTypeBool},
			{Name: "old", FieldDataType: telemetrytypes.FieldDataTypeBool},
		},
	}
	expr, err := LogicalValueExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "multiIf(has(current), value(current), has(old), value(old), false)", expr)
}

func TestLogicalExistsExprSingleMemberDelegatesToExistsFor(t *testing.T) {
	logical := telemetrytypes.SingleLogicalField("a", &telemetrytypes.TelemetryFieldKey{Name: "a"})
	expr, err := LogicalExistsExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, logical, false)
	require.NoError(t, err)
	assert.Equal(t, "NOT has(a)", expr)
}

func TestLogicalExistsExprFamilyIsAnyMemberPresence(t *testing.T) {
	family := stringFamily("current", "old")

	expr, err := LogicalExistsExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, family, true)
	require.NoError(t, err)
	assert.Equal(t, "(has(current) OR has(old))", expr)

	expr, err = LogicalExistsExpr(context.Background(), valuer.UUID{}, 0, 0, stubFieldMapper{}, family, false)
	require.NoError(t, err)
	assert.Equal(t, "NOT (has(current) OR has(old))", expr)
}
