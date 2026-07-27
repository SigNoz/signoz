package telemetrylogs

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// A bare key absent from metadata groups by a multiIf over the synthesized
// attribute maps first (string, number, bool) and the body path last; legacy
// body doesn't support group by, so with the flag off only attributes remain.
func TestStatementBuilderGroupByUnknownKey(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	cases := []struct {
		name        string
		useJSONBody bool
		expected    string
	}{
		{
			name:        "legacy body",
			useJSONBody: false,
			expected:    "SELECT toString(multiIf(mapContains(attributes_string, 'totally.unknown.key'), attributes_string['totally.unknown.key'], mapContains(attributes_number, 'totally.unknown.key'), toString(attributes_number['totally.unknown.key']), mapContains(attributes_bool, 'totally.unknown.key'), toString(attributes_bool['totally.unknown.key']), NULL)) AS `__GROUP_BY_KEY_0_totally.unknown.key`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_totally.unknown.key` ORDER BY __result_0 DESC",
		},
		{
			name:        "json body",
			useJSONBody: true,
			expected:    "SELECT toString(multiIf(mapContains(attributes_string, 'totally.unknown.key'), attributes_string['totally.unknown.key'], mapContains(attributes_number, 'totally.unknown.key'), toString(attributes_number['totally.unknown.key']), mapContains(attributes_bool, 'totally.unknown.key'), toString(attributes_bool['totally.unknown.key']), (dynamicElement(body_v2.`totally.unknown.key`, 'String') IS NOT NULL), dynamicElement(body_v2.`totally.unknown.key`, 'String'), NULL)) AS `__GROUP_BY_KEY_0_totally.unknown.key`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_totally.unknown.key` ORDER BY __result_0 DESC",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fl := flaggertest.WithUseJSONBody(t, c.useJSONBody)
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMap(releaseTime)
			fm := NewFieldMapper(fl)
			cb := NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, fm, cb, aggExprRewriter,
				DefaultFullTextColumn, fl, nil, false, 100000,
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "totally.unknown.key"}},
				},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, c.expected, q.Query)
		})
	}
}
