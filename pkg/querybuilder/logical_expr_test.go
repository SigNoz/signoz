package querybuilder

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubStorage provides the one read the shared composition builds on.
type stubStorage struct{}

func (stubStorage) Read(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (qbtypes.Read, error) {
	return qbtypes.Read{SQL: "value(" + key.Name + ")", Presence: "has(" + key.Name + ")", Absence: "NOT has(" + key.Name + ")", WhenAbsent: qbtypes.AbsentIsSentinel}, nil
}

func (stubStorage) Fallback(context.Context, qbtypes.QueryInfo, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) ([]*telemetrytypes.LogicalField, error) {
	return nil, nil
}

func (stubStorage) Traits() qbtypes.Traits {
	return qbtypes.Traits{}
}

func (s stubStorage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	return SharedCondition(ctx, q, s, logical, operator, value, sb)
}

func stringFamily(names ...string) *telemetrytypes.LogicalField {
	members := make([]*telemetrytypes.TelemetryFieldKey, 0, len(names))
	for _, name := range names {
		members = append(members, &telemetrytypes.TelemetryFieldKey{Name: name, FieldDataType: telemetrytypes.FieldDataTypeString})
	}
	return &telemetrytypes.LogicalField{Name: names[0], FieldDataType: telemetrytypes.FieldDataTypeString, Members: members}
}

func TestLogicalReadSingleMemberDelegatesToRead(t *testing.T) {
	logical := telemetrytypes.SingleLogicalField("a", &telemetrytypes.TelemetryFieldKey{Name: "a"})
	read, err := LogicalRead(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "value(a)", read.SQL)
}

func TestLogicalReadStringFamilyMergesCurrentFirst(t *testing.T) {
	read, err := LogicalRead(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, stringFamily("current", "old"))
	require.NoError(t, err)
	// The trailing '' preserves keyless-row semantics for negative operators.
	assert.Equal(t, "COALESCE(NULLIF(value(current), ''), NULLIF(value(old), ''), '')", read.SQL)
}

func TestLogicalReadNumericFamilyGuardsEveryMember(t *testing.T) {
	logical := &telemetrytypes.LogicalField{
		Name:          "current",
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
		Members: []*telemetrytypes.TelemetryFieldKey{
			{Name: "current", FieldDataType: telemetrytypes.FieldDataTypeNumber},
			{Name: "old", FieldDataType: telemetrytypes.FieldDataTypeNumber},
		},
	}
	read, err := LogicalRead(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "multiIf(has(current), value(current), has(old), value(old), NULL)", read.SQL)
}

func TestLogicalReadSingleMemberDelegatesAbsence(t *testing.T) {
	logical := telemetrytypes.SingleLogicalField("a", &telemetrytypes.TelemetryFieldKey{Name: "a"})
	read, err := LogicalRead(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "NOT has(a)", read.Absence)
}

func TestLogicalReadFamilyPresenceIsAnyMember(t *testing.T) {
	family := stringFamily("current", "old")

	read, err := LogicalRead(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, family)
	require.NoError(t, err)
	assert.Equal(t, "(has(current) OR has(old))", read.Presence)

	assert.Equal(t, "NOT (has(current) OR has(old))", read.Absence)
}
