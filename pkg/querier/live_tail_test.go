package querier

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/logsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestLiveTailFilterExpression(t *testing.T) {
	cases := []struct {
		name       string
		expression string
		expected   string
	}{
		{name: "no filter", expression: "", expected: "id > $id"},
		{name: "blank filter", expression: "  ", expected: "id > $id"},
		{name: "single condition", expression: "service.name = 'agent'", expected: "(service.name = 'agent') and id > $id"},
		{
			name:       "top-level or",
			expression: "service.name = 'agent' or severity_text = 'error'",
			expected:   "(service.name = 'agent' or severity_text = 'error') and id > $id",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			require.Equal(t, c.expected, liveTailFilterExpression(c.expression))
		})
	}
}

// The filter from #13699. Without the parentheses the id bound only applied to the
// right-hand side of the `or`, so the newest row matching the left-hand side was
// streamed again on every poll.
func TestLiveTailFilterBoundsEveryBranchOfAnOr(t *testing.T) {
	ctx := context.Background()
	fl := flaggertest.New(t)
	metadataStore := telemetrytypestest.NewMockMetadataStore()
	storage := logstelemetryschema.NewStorage()
	metadataStore.KeysMap = logstelemetryschema.BuildCompleteFieldKeyMap(time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC))
	providerSettings := instrumentationtest.New().ToProviderSettings()
	builder := logsstatementbuilder.NewLogQueryStatementBuilder(
		providerSettings,
		metadataStore,
		storage,
		querybuilder.NewAggExprRewriter(providerSettings, nil, storage, fl, telemetrytypes.SignalLogs),
		logstelemetryschema.DefaultFullTextColumn,
		fl,
		nil,
		statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
	)

	filter := "(service.name in ['agent'] severity_text not in ['debug']) or (severity_text not in ['debug', 'info', 'warn'])"
	stmt, err := builder.Build(ctx, valuer.UUID{}, 1747947419000, 0, qbtypes.RequestTypeRawStream, qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		Signal: telemetrytypes.SignalLogs,
		Filter: &qbtypes.Filter{Expression: liveTailFilterExpression(filter)},
		Limit:  500,
	}, map[string]qbtypes.VariableItem{"id": {Value: "2abc"}})
	require.NoError(t, err)

	where := stmt.Query[strings.Index(stmt.Query, " WHERE ")+len(" WHERE ") : strings.Index(stmt.Query, " AND timestamp >= ?")]
	require.Equal(t,
		"(((((((resource.`service.name`::String = ?) AND resource.`service.name` IS NOT NULL) AND (severity_text <> ?))) OR ((severity_text <> ? AND severity_text <> ? AND severity_text <> ?)))) AND id > ?)",
		where,
	)
	require.Equal(t, []any{"agent", "debug", "debug", "info", "warn", "2abc", "1747947419000000000", uint64(1747945619), 500}, stmt.Args)
}
