package resourcefilter

import (
	"context"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// negatedLabelHints returns the patterns bound to `labels NOT LIKE ?`.
func negatedLabelHints(sql string, args []any) []string {
	parts := strings.Split(sql, "?")
	hints := []string{}
	for i := 0; i < len(parts)-1; i++ {
		if strings.HasSuffix(parts[i], "labels NOT LIKE ") {
			hints = append(hints, args[i].(string))
		}
	}
	return hints
}

// The labels column holds the collector's json.Marshal of the resource map, and a
// LIKE hint over it cannot be anchored to one key's value, so a negated filter
// must carry no `labels NOT LIKE` hint and rely on the exact value comparison.
func TestNegatedIndexHintKeepsRowsThatMatchTheFilter(t *testing.T) {
	cases := []struct {
		name  string
		key   string
		op    qbtypes.FilterOperator
		value any
	}{
		{"not equal keeps a longer value", "deployment.environment", qbtypes.FilterOperatorNotEqual, "prod"},
		{"not equal keeps another key ending in the key", "service.name", qbtypes.FilterOperatorNotEqual, "api"},
		{"not in keeps a longer value", "service.name", qbtypes.FilterOperatorNotIn, []any{"api", "db"}},
	}
	storage := newStorage()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			key := &telemetrytypes.TelemetryFieldKey{Name: tc.key, FieldContext: telemetrytypes.FieldContextResource}
			sb := sqlbuilder.NewSelectBuilder()
			conds, _, err := querybuilder.Conditions(context.Background(), qbtypes.QueryInfo{}, storage, key, tc.op, tc.value, map[string][]*telemetrytypes.TelemetryFieldKey{tc.key: {key}}, false, sb)
			require.NoError(t, err)
			sb.Where(conds...)
			sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			require.Empty(t, negatedLabelHints(sql, args), "a negated filter must not add a labels NOT LIKE hint: %s", sql)
			require.Contains(t, sql, "simpleJSONExtractString(labels, '"+tc.key+"') <> ?")
		})
	}
}
