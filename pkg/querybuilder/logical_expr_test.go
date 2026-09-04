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

// stubStorage provides the two reads the shared composition builds on.
type stubStorage struct{}

func (stubStorage) Read(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return "value(" + key.Name + ")", nil
}

func (stubStorage) Exists(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	if exists {
		return qbtypes.Existence{Predicate: "has(" + key.Name + ")", WhenAbsent: qbtypes.AbsentIsSentinel}, nil
	}
	return qbtypes.Existence{Predicate: "NOT has(" + key.Name + ")", WhenAbsent: qbtypes.AbsentIsSentinel}, nil
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

func (s stubStorage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return DefaultRead(ctx, q, s, logical)
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
	expr, err := LogicalValueExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "value(a)", expr)
}

func TestLogicalValueExprStringFamilyMergesCurrentFirst(t *testing.T) {
	expr, err := LogicalValueExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, stringFamily("current", "old"))
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
	expr, err := LogicalValueExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical)
	require.NoError(t, err)
	assert.Equal(t, "multiIf(has(current), value(current), has(old), value(old), NULL)", expr)
}

func TestLogicalExistsExprSingleMemberDelegatesToExistsFor(t *testing.T) {
	logical := telemetrytypes.SingleLogicalField("a", &telemetrytypes.TelemetryFieldKey{Name: "a"})
	existence, err := LogicalExistsExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, logical, false)
	require.NoError(t, err)
	assert.Equal(t, "NOT has(a)", existence.Predicate)
}

func TestLogicalExistsExprFamilyIsAnyMemberPresence(t *testing.T) {
	family := stringFamily("current", "old")

	existence, err := LogicalExistsExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, family, true)
	require.NoError(t, err)
	assert.Equal(t, "(has(current) OR has(old))", existence.Predicate)

	existence, err = LogicalExistsExpr(context.Background(), qbtypes.QueryInfo{}, stubStorage{}, family, false)
	require.NoError(t, err)
	assert.Equal(t, "NOT (has(current) OR has(old))", existence.Predicate)
}
