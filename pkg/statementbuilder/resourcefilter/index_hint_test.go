package resourcefilter

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// likeToRegexp mirrors ClickHouse LIKE: % is any run, _ is one character and
// a backslash escapes the next character.
func likeToRegexp(pattern string) *regexp.Regexp {
	var b strings.Builder
	b.WriteString("(?s)^")
	runes := []rune(pattern)
	for i := 0; i < len(runes); i++ {
		switch r := runes[i]; r {
		case '%':
			b.WriteString(".*")
		case '_':
			b.WriteString(".")
		case '\\':
			if i+1 < len(runes) {
				i++
				b.WriteString(regexp.QuoteMeta(string(runes[i])))
			} else {
				b.WriteString(regexp.QuoteMeta(`\`))
			}
		default:
			b.WriteString(regexp.QuoteMeta(string(r)))
		}
	}
	b.WriteString("$")
	return regexp.MustCompile(b.String())
}

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

// The labels column holds the collector's json.Marshal of the resource map, so
// a negated hint must never match a row whose value differs from the operand.
func TestNegatedIndexHintKeepsRowsThatMatchTheFilter(t *testing.T) {
	cases := []struct {
		name   string
		key    string
		op     qbtypes.FilterOperator
		value  any
		labels map[string]string
	}{
		{"not equal keeps a longer value", "deployment.environment", qbtypes.FilterOperatorNotEqual, "prod", map[string]string{"deployment.environment": "production"}},
		{"not equal keeps another key ending in the key", "service.name", qbtypes.FilterOperatorNotEqual, "api", map[string]string{"service.name": "worker", "peer.service.name": "api"}},
		{"not in keeps a longer value", "service.name", qbtypes.FilterOperatorNotIn, []any{"api", "db"}, map[string]string{"service.name": "api-gateway"}},
	}
	storage := newStorage()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			raw, err := json.Marshal(tc.labels)
			require.NoError(t, err)
			key := &telemetrytypes.TelemetryFieldKey{Name: tc.key, FieldContext: telemetrytypes.FieldContextResource}
			sb := sqlbuilder.NewSelectBuilder()
			conds, _, err := querybuilder.Conditions(context.Background(), qbtypes.QueryInfo{}, storage, key, tc.op, tc.value, map[string][]*telemetrytypes.TelemetryFieldKey{tc.key: {key}}, false, sb)
			require.NoError(t, err)
			sb.Where(conds...)
			sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			for _, hint := range negatedLabelHints(sql, args) {
				require.False(t, likeToRegexp(hint).MatchString(string(raw)), "labels NOT LIKE %q drops %s", hint, raw)
			}
		})
	}
}
