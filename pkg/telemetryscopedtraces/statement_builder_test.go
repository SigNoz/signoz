package telemetryscopedtraces

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// The full-pipeline golden tests live in pkg/telemetryai, which exercises this
// builder through its production provider pair. The tests here cover only what
// needs the package internals: builder states not reachable through the
// constructor.

// stubGate scopes to spans carrying a single attribute key.
type stubGate struct {
	key *telemetrytypes.TelemetryFieldKey
}

func (s stubGate) FilterExpression() string { return s.key.Name + " EXISTS" }
func (s stubGate) FieldKeys() []*telemetrytypes.TelemetryFieldKey {
	return []*telemetrytypes.TelemetryFieldKey{s.key}
}

// stubColumns is the common columns plus one orderable scoped aggregate, the
// minimum a column provider must supply (a default order key).
type stubColumns struct {
	key *telemetrytypes.TelemetryFieldKey
}

func (s stubColumns) Columns() []TraceColumn {
	return append(CommonTraceColumns(),
		TraceColumn{Alias: "scoped_span_count", Orderable: true, Expr: CountExists(s.key)})
}
func (s stubColumns) DefaultOrderAlias() string { return "scoped_span_count" }
func (s stubColumns) ActivityGateAlias() string { return "" }
func (s stubColumns) AggregateAliases() []string {
	aliases := make([]string, 0)
	for _, c := range s.Columns() {
		if !c.SpanLevel {
			aliases = append(aliases, c.Alias)
		}
	}
	return aliases
}

// renderSQL substitutes bound args into the `?` placeholders so assertions can
// match the statement as one literal SQL string.
func renderSQL(t *testing.T, stmt *qbtypes.Statement) string {
	t.Helper()
	var b strings.Builder
	argi := 0
	for i := 0; i < len(stmt.Query); i++ {
		if stmt.Query[i] == '?' {
			require.Less(t, argi, len(stmt.Args), "more ? than args in query")
			if s, ok := stmt.Args[argi].(string); ok {
				b.WriteString("'" + s + "'")
			} else {
				fmt.Fprintf(&b, "%v", stmt.Args[argi])
			}
			argi++
			continue
		}
		b.WriteByte(stmt.Query[i])
	}
	require.Equal(t, len(stmt.Args), argi, "arg count does not match number of placeholders")
	return b.String()
}

// With the resolver unset (nil), the resource filter falls back to being applied inline
// on the span index — no fingerprint CTE — so existing behavior is preserved. The nil
// state is not reachable through the constructor, hence the direct struct literal.
func TestBuild_TraceList_ResourceFilter_NoResolver(t *testing.T) {
	gateKey := &telemetrytypes.TelemetryFieldKey{
		Name:          "scope.marker",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = map[string][]*telemetrytypes.TelemetryFieldKey{
		gateKey.Name: {gateKey},
		"service.name": {{
			Name:          "service.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	settings := factory.NewScopedProviderSettings(instrumentationtest.New().ToProviderSettings(), "github.com/SigNoz/signoz/pkg/telemetryscopedtraces")
	fm := telemetrytraces.NewFieldMapper()
	b := &scopedTraceStatementBuilder{
		logger:                 settings.Logger(),
		metadataStore:          mockMetadataStore,
		fm:                     fm,
		cb:                     telemetrytraces.NewConditionBuilder(fm),
		baseCond:               stubGate{key: gateKey},
		columnProvider:         stubColumns{key: gateKey},
		resourceFilterResolver: nil,
	}

	stmt, err := b.Build(context.Background(), 1747947419000, 1747983448000, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "resource.service.name = 'checkout'"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	require.NotContains(t, got, "__resource_filter")
	require.Contains(t, got, "resources_string['service.name']")
}

// embedExpr treats every `?` byte as a placeholder; a count/args mismatch (an expr
// carrying a literal `?`, or a dropped arg) must fail loudly instead of silently
// shifting every subsequent arg into the wrong placeholder.
func TestEmbedExpr_PlaceholderArgMismatch(t *testing.T) {
	sb := sqlbuilder.NewSelectBuilder()

	out, err := embedExpr(sb, "x = ? AND y = ?", []any{1, 2})
	require.NoError(t, err)
	require.Equal(t, 2, strings.Count(out, "$"), "both placeholders bound as builder vars")

	_, err = embedExpr(sb, "x = ? AND y LIKE 'a?b'", []any{1})
	require.Error(t, err, "literal ? in the expr must not pass as a placeholder")

	_, err = embedExpr(sb, "x = ?", []any{1, 2})
	require.Error(t, err, "extra args must not be silently dropped")
}
