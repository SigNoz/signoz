package querybuilder

import (
	"context"
	"strings"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// fakeFieldMapper rewrites every key to a fixed `attrs[k]` style column
// expression so the rewriter has something to substitute. Tests only
// inspect the head function name and the presence of the column, not
// the exact mapping.
type fakeFieldMapper struct{}

func (fakeFieldMapper) FieldFor(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}
func (fakeFieldMapper) ColumnFor(_ context.Context, _, _ uint64, _ *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return nil, nil
}
func (fakeFieldMapper) ColumnExpressionFor(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey, _ map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}

type fakeConditionBuilder struct{}

func (fakeConditionBuilder) ConditionFor(_ context.Context, _, _ uint64, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any, _ *sqlbuilder.SelectBuilder) (string, error) {
	return key.Name + " = ?", nil
}

func newTestRewriter(t *testing.T) *aggExprRewriter {
	t.Helper()
	return NewAggExprRewriter(
		instrumentationtest.New().ToProviderSettings(),
		nil,
		fakeFieldMapper{},
		fakeConditionBuilder{},
		nil,
		flaggertest.New(t),
	)
}

func TestRewrite_SimpleAggregates(t *testing.T) {
	r := newTestRewriter(t)
	ctx := context.Background()
	keys := map[string][]*telemetrytypes.TelemetryFieldKey{}

	cases := []struct {
		name     string
		expr     string
		wantHead string
	}{
		{"count_no_args", "count()", "count("},
		{"count_with_arg", "count(latency)", "count("},
		{"sum", "sum(latency)", "sum("},
		{"avg", "avg(latency)", "avg("},
		{"min", "min(latency)", "min("},
		{"max", "max(latency)", "max("},
		{"p99", "p99(latency)", "quantile(0.99)("},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, _, err := r.Rewrite(ctx, 0, 1, c.expr, 1, keys)
			require.NoError(t, err)
			require.True(t, strings.HasPrefix(got, c.wantHead),
				"want prefix %q, got %q", c.wantHead, got)
		})
	}
}

func TestRewrite_RateAppliesDivision(t *testing.T) {
	r := newTestRewriter(t)
	got, _, err := r.Rewrite(context.Background(), 0, 1, "rate(latency)", 60, nil)
	require.NoError(t, err)
	require.Contains(t, got, "/60", "rate output must apply rate-interval division: %s", got)
}

func TestRewrite_UnknownFunction(t *testing.T) {
	r := newTestRewriter(t)
	_, _, err := r.Rewrite(context.Background(), 0, 1, "nosuchfn(latency)", 0, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unrecognized function")
}

func TestRewrite_BadExpression(t *testing.T) {
	r := newTestRewriter(t)
	_, _, err := r.Rewrite(context.Background(), 0, 1, "this is not sql ((", 0, nil)
	require.Error(t, err)
}

func TestRewriteWithState_SwapsToStateName(t *testing.T) {
	r := newTestRewriter(t)
	cases := []struct {
		expr     string
		wantHead string
	}{
		{"count(latency)", "countState("},
		{"count()", "countState("},
		{"sum(latency)", "sumState("},
		{"avg(latency)", "avgState("},
		{"min(latency)", "minState("},
		{"max(latency)", "maxState("},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			got, _, err := r.RewriteWithState(context.Background(), 0, 1, c.expr, nil)
			require.NoError(t, err)
			require.True(t, strings.HasPrefix(got, c.wantHead),
				"want prefix %q, got %q", c.wantHead, got)
		})
	}
}

func TestRewriteWithState_RejectsAggregatesWithoutState(t *testing.T) {
	r := newTestRewriter(t)
	cases := []string{
		"p99(latency)",            // quantile — no StateName registered
		"count_distinct(latency)", // not state-cacheable in v1
	}
	for _, expr := range cases {
		t.Run(expr, func(t *testing.T) {
			_, _, err := r.RewriteWithState(context.Background(), 0, 1, expr, nil)
			require.Error(t, err)
			require.True(t, errors.Is(err, ErrAggregateNotStateCacheable),
				"want ErrAggregateNotStateCacheable, got %v", err)
		})
	}
}

func TestRewriteWithState_RateAggregatesEmitBaseStateNoDivision(t *testing.T) {
	r := newTestRewriter(t)
	// Rate aggregates emit only the underlying state (no /<window>
	// suffix) — the rate division happens post-merge in Go using the
	// full query window.
	cases := []struct {
		expr     string
		wantHead string
	}{
		{"rate(latency)", "countState("},
		{"rate_sum(latency)", "sumState("},
		{"rate_avg(latency)", "avgState("},
		{"rate_min(latency)", "minState("},
		{"rate_max(latency)", "maxState("},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			got, _, err := r.RewriteWithState(context.Background(), 0, 1, c.expr, nil)
			require.NoError(t, err)
			require.True(t, strings.HasPrefix(got, c.wantHead),
				"want prefix %q, got %q", c.wantHead, got)
			require.NotContains(t, got, "/", "RewriteWithState must not apply rate division: %s", got)
		})
	}
}

func TestRewriteWithState_RejectsNonFunctionExpr(t *testing.T) {
	r := newTestRewriter(t)
	// Bare column expression, not a function call — should be rejected.
	_, _, err := r.RewriteWithState(context.Background(), 0, 1, "latency", nil)
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrAggregateNotStateCacheable),
		"want ErrAggregateNotStateCacheable, got %v", err)
}

func TestRewriteWithState_PropagatesParseErrors(t *testing.T) {
	r := newTestRewriter(t)
	_, _, err := r.RewriteWithState(context.Background(), 0, 1, "this is not sql ((", nil)
	require.Error(t, err)
}

func TestExtractOuterAggName(t *testing.T) {
	cases := []struct {
		expr      string
		wantName  string
		wantFound bool
	}{
		{"avg(latency)", "avg", true},
		{"COUNT(latency)", "count", true},
		{"p99(latency)", "p99", true},
		{"latency", "", false},      // not a function
		{"unknownfn(x)", "", false}, // not in AggreFuncMap
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			af, ok := ExtractOuterAggName(c.expr)
			require.Equal(t, c.wantFound, ok)
			if ok {
				require.Equal(t, c.wantName, af.Name.StringValue())
			}
		})
	}
}
