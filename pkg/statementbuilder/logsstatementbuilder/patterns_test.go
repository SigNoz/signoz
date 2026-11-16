package logsstatementbuilder

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatementBuilderPatterns(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	fl := flaggertest.New(t)
	metadataStore := telemetrytypestest.NewMockMetadataStore()
	metadataStore.KeysMap = logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
	storage := logstelemetryschema.NewStorage()
	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		metadataStore,
		storage,
		querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs),
		logstelemetryschema.DefaultFullTextColumn,
		fl,
		nil,
		statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
	)
	start, end := uint64(1767225600000), uint64(1767232800000)
	patternExpr := logstelemetryschema.PatternExpr()
	serviceColumn := "toString(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, NULL)) AS `__GROUP_BY_KEY_0_service.name`"

	t.Run("CountsOnASampleSizedByTheFilteredLogs", func(t *testing.T) {
		stmt, err := statementBuilder.Build(context.Background(), valuer.UUID{}, start, end, qbtypes.RequestTypePattern, qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal: telemetrytypes.SignalLogs,
			Filter: &qbtypes.Filter{Expression: "severity_text = 'ERROR'"},
		}, nil)
		require.NoError(t, err)

		filter := "WHERE severity_text = ? AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ?"
		assert.True(t, strings.HasPrefix(stmt.Query, "WITH __pattern_sample AS (SELECT greatest(toUInt64(1), toUInt64(ceil(count() / 100000))) AS rate, count() AS total FROM signoz_logs.distributed_logs_v2 "+filter+") SELECT "+patternExpr+" AS __pattern, toString(cityHash64(__pattern)) AS __pattern_id, "+serviceColumn+", count() AS __sampled_count"), stmt.Query)
		assert.True(t, strings.HasSuffix(stmt.Query, " FROM signoz_logs.distributed_logs_v2 "+filter+" AND cityHash64(id) % (SELECT rate FROM __pattern_sample) = 0 GROUP BY __pattern, `__GROUP_BY_KEY_0_service.name` ORDER BY __sampled_count DESC, __pattern ASC LIMIT ?"), stmt.Query)
		assert.Contains(t, stmt.Query, "sumMap([toInt64(intDiv(timestamp, 20000000000) * 20000000000)], [toInt64(1)]) AS __trend")
		// the filter's arguments, once for the sample CTE and once for the main query
		filterArgs := []any{"ERROR", "1767225600000000000", uint64(1767223800), "1767232800000000000", uint64(1767232800)}
		assert.Equal(t, append(append(append([]any{}, filterArgs...), filterArgs...), 50), stmt.Args)
		assert.Nil(t, stmt.CostGuard)
	})

	t.Run("GroupBy_LimitAndPatternFilter", func(t *testing.T) {
		stmt, err := statementBuilder.Build(context.Background(), valuer.UUID{}, start, end, qbtypes.RequestTypePattern, qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "NOT pattern('<IP>')"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "severity_text"}}},
			Limit:   10,
		}, nil)
		require.NoError(t, err)

		// patterns are always counted per service first, then per the query's group by
		assert.Contains(t, stmt.Query, serviceColumn+", toString(severity_text) AS `__GROUP_BY_KEY_1_severity_text`")
		assert.True(t, strings.HasSuffix(stmt.Query, " GROUP BY __pattern, `__GROUP_BY_KEY_0_service.name`, `__GROUP_BY_KEY_1_severity_text` ORDER BY __sampled_count DESC, __pattern ASC LIMIT ?"), stmt.Query)
		assert.Contains(t, stmt.Query, "WHERE NOT (match("+patternExpr+", ?))")
		assert.Equal(t, 10, stmt.Args[len(stmt.Args)-1])
		require.NotNil(t, stmt.CostGuard)
	})

	t.Run("LimitOverMax", func(t *testing.T) {
		_, err := statementBuilder.Build(context.Background(), valuer.UUID{}, start, end, qbtypes.RequestTypePattern, qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal: telemetrytypes.SignalLogs,
			Limit:  qbtypes.PatternsMaxLimit + 1,
		}, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "at most 1000 patterns")
	})
}
