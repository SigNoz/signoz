package querier

import (
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/prometheus"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Milliseconds, which is what both callers pass; AssignReservedVars scales them.
const (
	testStartMS uint64 = 1700000000000
	testEndMS   uint64 = 1700000600000
)

func TestSubstituteVariables(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		vars         map[string]qbtypes.VariableItem
		formatValue  func(any) string
		templateName string
		expected     string
	}{
		{
			name:         "curly syntax with clickhouse formatter quotes strings",
			query:        `SELECT * FROM t WHERE service = {{service}}`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'api'`,
		},
		{
			name:         "square syntax",
			query:        `SELECT * FROM t WHERE service = [[service]]`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'api'`,
		},
		{
			name:         "dollar syntax",
			query:        `SELECT * FROM t WHERE service = $service`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'api'`,
		},
		{
			name:  "all three syntaxes in one query",
			query: `SELECT * FROM t WHERE a = {{service}} AND b = [[service]] AND c = $service`,
			vars:  map[string]qbtypes.VariableItem{"service": {Value: "api"}},

			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE a = 'api' AND b = 'api' AND c = 'api'`,
		},
		{
			// The longest-first ordering is what keeps "host" from matching
			// inside "$host.name" and leaving a dangling ".name" behind.
			name:  "longest name wins when one name prefixes another",
			query: `SELECT * FROM t WHERE h = $host.name AND s = $host`,
			vars: map[string]qbtypes.VariableItem{
				"host":      {Value: "srv"},
				"host.name": {Value: "web-1"},
			},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE h = 'web-1' AND s = 'srv'`,
		},
		{
			name:         "numeric and boolean values are not quoted",
			query:        `SELECT * FROM t WHERE code = $code AND ok = $ok`,
			vars:         map[string]qbtypes.VariableItem{"code": {Value: 500}, "ok": {Value: false}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE code = 500 AND ok = false`,
		},
		{
			name:         "list value renders as a clickhouse array",
			query:        `SELECT * FROM t WHERE service IN $services`,
			vars:         map[string]qbtypes.VariableItem{"services": {Value: []any{"api", "web"}}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service IN ['api','web']`,
		},
		{
			name:         "list value renders as a promql alternation",
			query:        `sum(rate(m{service=~"$services"}[5m]))`,
			vars:         map[string]qbtypes.VariableItem{"services": {Value: []any{"api", "web"}}},
			formatValue:  formatValueForProm,
			templateName: "promql-query",
			expected:     `sum(rate(m{service=~"api|web"}[5m]))`,
		},
		{
			name:         "promql formatter leaves strings unquoted",
			query:        `sum(rate(m{service="$service"}[5m]))`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForProm,
			templateName: "promql-query",
			expected:     `sum(rate(m{service="api"}[5m]))`,
		},
		{
			name:         "reserved time range variables",
			query:        `SELECT * FROM t WHERE ts BETWEEN $start_timestamp_ms AND $end_timestamp_ms`,
			vars:         map[string]qbtypes.VariableItem{},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE ts BETWEEN 1700000000000 AND 1700000600000`,
		},
		{
			name:         "reserved second, nano and datetime variables",
			query:        `$start_timestamp $end_timestamp $start_timestamp_nano $end_timestamp_nano {{start_datetime}} [[end_datetime]]`,
			vars:         map[string]qbtypes.VariableItem{},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `1700000000 1700000600 1700000000000000000 1700000600000000000 toDateTime(1700000000) toDateTime(1700000600)`,
		},
		{
			name:         "reserved SIGNOZ variables",
			query:        `SELECT * FROM t WHERE ts BETWEEN $SIGNOZ_START_TIME AND $SIGNOZ_END_TIME`,
			vars:         map[string]qbtypes.VariableItem{},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE ts BETWEEN 1700000000000 AND 1700000600000`,
		},
		{
			// A dotted reference survives the literal pass and is resolved by
			// the go template pass instead.
			name:         "go template reference is evaluated against the same variables",
			query:        `SELECT * FROM t WHERE service = {{.service}}`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'api'`,
		},
		{
			name:         "go template control flow is evaluated",
			query:        `SELECT * FROM t{{if .service}} WHERE service = {{.service}}{{end}}`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'api'`,
		},
		{
			name:         "query with no variables is unchanged",
			query:        `SELECT count() FROM t`,
			vars:         map[string]qbtypes.VariableItem{},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT count() FROM t`,
		},
		{
			name:         "unknown variable reference is left alone",
			query:        `SELECT * FROM t WHERE service = $nope`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = $nope`,
		},
		{
			name:         "single quote in a value is escaped for clickhouse",
			query:        `SELECT * FROM t WHERE service = $service`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: `o'brien`}},
			formatValue:  formatValueForCH,
			templateName: "clickhouse-query",
			expected:     `SELECT * FROM t WHERE service = 'o\'brien'`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := substituteVariables(tt.query, tt.vars, testStartMS, testEndMS, tt.formatValue, tt.templateName)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestSubstituteVariablesErrors(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		vars         map[string]qbtypes.VariableItem
		templateName string
	}{
		{
			name:         "unclosed action fails to parse",
			query:        `SELECT * FROM t WHERE service = {{.service`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			templateName: "clickhouse-query",
		},
		{
			name:         "unterminated if fails to parse",
			query:        `SELECT * FROM t{{if .service}} WHERE service = {{.service}}`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			templateName: "clickhouse-query",
		},
		{
			name:         "field lookup on a non struct fails to execute",
			query:        `SELECT * FROM t WHERE service = {{.service.name}}`,
			vars:         map[string]qbtypes.VariableItem{"service": {Value: "api"}},
			templateName: "promql-query",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := substituteVariables(tt.query, tt.vars, testStartMS, testEndMS, formatValueForCH, tt.templateName)
			require.Error(t, err)
			assert.Empty(t, got)
			assert.Contains(t, err.Error(), tt.templateName)
		})
	}
}

// The two callers differ only in how a value is formatted, so the same query
// and variables must render for each dialect's own conventions.
func TestRenderVarsPerDialect(t *testing.T) {
	vars := map[string]qbtypes.VariableItem{"service": {Value: "api"}}

	t.Run("clickhouse", func(t *testing.T) {
		q := &chSQLQuery{}
		got, err := q.renderVars(`SELECT * FROM t WHERE service = $service AND ts >= $start_timestamp_ms`, vars, testStartMS, testEndMS)
		require.NoError(t, err)
		assert.Equal(t, `SELECT * FROM t WHERE service = 'api' AND ts >= 1700000000000`, got)
	})

	t.Run("promql", func(t *testing.T) {
		q := &promqlQuery{logger: slog.Default(), parser: prometheus.NewParser()}
		got, err := q.renderVars(`sum(rate(m{service="$service"}[5m]))`, vars, testStartMS, testEndMS)
		require.NoError(t, err)
		assert.Equal(t, `sum(rate(m{service="api"}[5m]))`, got)
	})
}

// The __all__ pre-step is PromQL-only: it drops the matcher rather than
// substituting the sentinel into the query.
func TestRenderVarsPromqlDropsAllMatcher(t *testing.T) {
	q := &promqlQuery{logger: slog.Default(), parser: prometheus.NewParser()}

	got, err := q.renderVars(
		`sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
		map[string]qbtypes.VariableItem{
			"host.name": {Type: qbtypes.DynamicVariableType, Value: "__all__"},
		},
		testStartMS, testEndMS,
	)
	require.NoError(t, err)
	assert.Equal(t, `sum(rate({__name__="system.cpu.time"}[5m]))`, got)
}
