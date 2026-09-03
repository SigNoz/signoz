package implrulestatehistory

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The pins below fix the exact operator forms of this builder, including the
// two shapes that exist nowhere else: IN binds the whole list to one
// placeholder (sb.In without spreading), and the exists predicate renders
// "true" for an intrinsic column but a JSONHas membership check for a label.
func TestConditionForPinsOperatorForms(t *testing.T) {
	ctx := context.Background()
	fm := newFieldMapper()
	cb := newConditionBuilder(fm)

	intrinsic := &telemetrytypes.TelemetryFieldKey{Name: "state"}
	label := &telemetrytypes.TelemetryFieldKey{Name: "deployment"}

	cases := []struct {
		name         string
		key          *telemetrytypes.TelemetryFieldKey
		operator     qbtypes.FilterOperator
		value        any
		expectedSQL  string
		expectedArgs []any
	}{
		{name: "intrinsic equal", key: intrinsic, operator: qbtypes.FilterOperatorEqual, value: "firing", expectedSQL: "WHERE state = ?", expectedArgs: []any{"firing"}},
		{name: "intrinsic not equal", key: intrinsic, operator: qbtypes.FilterOperatorNotEqual, value: "firing", expectedSQL: "WHERE state <> ?", expectedArgs: []any{"firing"}},
		{name: "label equal", key: label, operator: qbtypes.FilterOperatorEqual, value: "production", expectedSQL: "WHERE JSONExtractString(labels, 'deployment') = ?", expectedArgs: []any{"production"}},
		{name: "greater than", key: &telemetrytypes.TelemetryFieldKey{Name: "unix_milli"}, operator: qbtypes.FilterOperatorGreaterThan, value: int64(123), expectedSQL: "WHERE unix_milli > ?", expectedArgs: []any{int64(123)}},
		{name: "like", key: intrinsic, operator: qbtypes.FilterOperatorLike, value: "fir", expectedSQL: "WHERE state LIKE ?", expectedArgs: []any{"fir"}},
		{name: "contains", key: intrinsic, operator: qbtypes.FilterOperatorContains, value: "fir", expectedSQL: "WHERE LOWER(state) LIKE LOWER(?)", expectedArgs: []any{"%fir%"}},
		{name: "regexp", key: intrinsic, operator: qbtypes.FilterOperatorRegexp, value: "^f", expectedSQL: "WHERE match(state, ?)", expectedArgs: []any{"^f"}},
		{name: "between", key: &telemetrytypes.TelemetryFieldKey{Name: "unix_milli"}, operator: qbtypes.FilterOperatorBetween, value: []any{int64(1), int64(2)}, expectedSQL: "WHERE unix_milli BETWEEN ? AND ?", expectedArgs: []any{int64(1), int64(2)}},
		{name: "in binds the list to one placeholder", key: intrinsic, operator: qbtypes.FilterOperatorIn, value: []any{"firing", "inactive"}, expectedSQL: "WHERE state IN (?)", expectedArgs: []any{[]any{"firing", "inactive"}}},
		{name: "not in binds the list to one placeholder", key: intrinsic, operator: qbtypes.FilterOperatorNotIn, value: []any{"firing"}, expectedSQL: "WHERE state NOT IN (?)", expectedArgs: []any{[]any{"firing"}}},
		{name: "intrinsic exists is constant true", key: intrinsic, operator: qbtypes.FilterOperatorExists, value: nil, expectedSQL: "WHERE true", expectedArgs: nil},
		{name: "label exists is a membership check", key: label, operator: qbtypes.FilterOperatorExists, value: nil, expectedSQL: "WHERE JSONHas(labels, ?)", expectedArgs: []any{"deployment"}},
		{name: "label not exists negates the membership check", key: label, operator: qbtypes.FilterOperatorNotExists, value: nil, expectedSQL: "WHERE not JSONHas(labels, ?)", expectedArgs: []any{"deployment"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{tc.key.Name: {tc.key}}
			sb := sqlbuilder.NewSelectBuilder()
			conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, tc.key,
				querybuilder.MatchingLogicalFields(ctx, valuer.UUID{}, nil, telemetrytypes.SignalUnspecified, nil, tc.key, fieldKeys),
				fieldKeys, qbtypes.ConditionBuilderOptions{}, tc.operator, tc.value, sb)
			require.NoError(t, err)
			require.Len(t, conds, 1)
			sb.Where(conds...)
			sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Equal(t, tc.expectedSQL, sql)
			assert.Equal(t, tc.expectedArgs, args)
		})
	}
}

// An unknown key is an error, and a function operator is rejected before
// resolution.
func TestConditionForRejections(t *testing.T) {
	ctx := context.Background()
	cb := newConditionBuilder(newFieldMapper())
	key := &telemetrytypes.TelemetryFieldKey{Name: "missing"}

	_, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, key, nil, nil, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, "x", sqlbuilder.NewSelectBuilder())
	assert.ErrorContains(t, err, "not found")

	_, _, err = cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, key, nil, nil, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorHasToken, "x", sqlbuilder.NewSelectBuilder())
	assert.Error(t, err)
}
