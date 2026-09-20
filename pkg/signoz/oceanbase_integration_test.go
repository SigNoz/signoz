package signoz

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/disabledprometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/oceanbasetelemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// This test requires a disposable-schema-capable OceanBase database. It creates
// only unique, test-owned tables and cleans those exact tables up afterwards.
// It exercises the production assembly + original Querier, not the old server.
func TestOceanBaseMainQueryStack(t *testing.T) {
	dsn := os.Getenv("SIGNOZ_TEST_OCEANBASE_DSN")
	if dsn == "" {
		t.Skip("set SIGNOZ_TEST_OCEANBASE_DSN for a real OceanBase integration test")
	}
	ctx := context.Background()
	db, err := sql.Open("mysql", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	prefix := "sn_test_" + strings.ReplaceAll(valuer.GenerateUUID().StringValue(), "-", "")[:12]
	for _, signal := range []string{"traces", "logs", "metric_samples"} {
		table := "`" + prefix + "_" + signal + "`"
		_, err := db.ExecContext(ctx, "CREATE TABLE "+table+" LIKE `signoz_"+signal+"`")
		require.NoError(t, err)
		t.Cleanup(func() { _, err := db.ExecContext(context.Background(), "DROP TABLE "+table); require.NoError(t, err) })
	}
	org := valuer.GenerateUUID()
	otherOrg := valuer.GenerateUUID()
	start := time.Now().Add(-2 * time.Minute).Truncate(time.Minute)
	for _, owner := range []valuer.UUID{org, otherOrg} {
		_, err := db.ExecContext(ctx, "INSERT INTO `"+prefix+"_traces` (org_id, space_id, timestamp, trace_id, span_id, span_name, span_kind, start_time_unix_nano, end_time_unix_nano, duration_nano, scope_attributes, resource_attributes, attributes, events, links, payload) VALUES (?, 'space-a', ?, '0123456789abcdef0123456789abcdef', '0123456789abcdef', 'tool.run', 'Client', ?, ?, 1000000, '{}', '{}', JSON_OBJECT('tokens', 5), ?, ?, '{}')", owner.StringValue(), start.UnixNano(), start.UnixNano(), start.Add(time.Millisecond).UnixNano(), `[{"name":"tool.start","timestamp_unix_nano":"1789000000123456789","attributes":{"ok":true}}]`, `[{"trace_id":"other-trace","span_id":"other-span"}]`)
		require.NoError(t, err)
	}
	for i, fixture := range []struct {
		org    valuer.UUID
		space  string
		tokens int
	}{{org, "space-a", 3}, {org, "space-a", 7}, {org, "space-b", 99}, {otherOrg, "space-a", 1000}} {
		_, err := db.ExecContext(ctx, "INSERT INTO `"+prefix+"_logs` (org_id, space_id, log_id, timestamp, timestamp_unix_nano, observed_time_unix_nano, body_text, body, body_json, scope_attributes, resource_attributes, attributes, payload, event_name, user_id) VALUES (?, ?, ?, ?, ?, ?, '', '', '{}', '{}', '{}', JSON_OBJECT('tokens', ?), '{}', 'tool.call', 'user-a')", fixture.org.StringValue(), fixture.space, valuer.GenerateUUID().StringValue(), start.Add(time.Duration(i+1)*time.Second).UnixNano(), start.UnixNano(), start.UnixNano(), fixture.tokens)
		require.NoError(t, err)
	}
	// Uneven sampling: series one has values 1,3; series two has value 10.
	// avg(time avg) = (2+10)/2 = 6, not sample avg = 14/3.
	for i, value := range []int{1, 3, 10} {
		series := "one"
		if i == 2 {
			series = "two"
		}
		_, err := db.ExecContext(ctx, "INSERT INTO `"+prefix+"_metric_samples` (org_id, space_id, sample_id, metric_name, metric_type, timestamp, timestamp_unix_nano, start_time_unix_nano, value, point_data, payload, scope_attributes, resource_attributes, attributes) VALUES (?, 'space-a', ?, 'test.gauge', 'gauge', ?, ?, 0, ?, '{}', '{}', '{}', '{}', JSON_OBJECT('series', ?))", org.StringValue(), valuer.GenerateUUID().StringValue(), start.Add(time.Duration(i+1)*time.Second).UnixNano(), start.UnixNano(), value, series)
		require.NoError(t, err)
	}
	cfg := Config{TelemetryStore: telemetrystore.NewConfigFactory().New().(telemetrystore.Config), Querier: querier.NewConfigFactory().New().(querier.Config)}
	cfg.TelemetryStore.Provider = "oceanbase"
	cfg.TelemetryStore.OceanBase.DSN = dsn
	cfg.TelemetryStore.OceanBase.TablePrefix = prefix
	settings := instrumentationtest.New().ToProviderSettings()
	store, err := oceanbasetelemetrystore.New(ctx, settings, cfg.TelemetryStore)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, store.(interface{ Close() error }).Close()) })
	cc, err := cachetest.New(*cache.NewConfigFactory().New().(*cache.Config))
	require.NoError(t, err)
	fl := flaggertest.New(t)
	metadata, trace, ai, logs, audit, metrics, meter, op, buckets, err := newQueryStack(ctx, settings, cfg, store, cc, fl)
	require.NoError(t, err)
	prom := disabledprometheus.New(settings, prometheus.NewConfigFactory().New().(prometheus.Config))
	q := querier.New(settings, store, metadata, prom, trace, ai, logs, audit, metrics, meter, op, buckets, fl, 0, 4)
	t.Run("AI Vision domain APIs", func(t *testing.T) {
		verifyMainAIVision(t, ctx, db, prefix, org, otherOrg, start, settings, store, q, cfg.TelemetryStore)
	})
	request := &qbtypes.QueryRangeRequest{
		Start: uint64(start.UnixMilli()), End: uint64(start.Add(time.Minute).UnixMilli()), RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{Name: "A", Signal: telemetrytypes.SignalLogs, Filter: &qbtypes.Filter{Expression: `space_id = 'space-a' AND (user_id = 'user-a' OR user_id = 'absent')`}, Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}, {Expression: "sum(tokens)"}}}}}},
	}
	result, err := q.QueryRange(ctx, org, request)
	require.NoError(t, err)
	require.Len(t, result.Data.Results, 1)
	scalar := result.Data.Results[0].(*qbtypes.ScalarData)
	require.Len(t, scalar.Data, 1)
	require.EqualValues(t, 2, scalar.Data[0][0])
	require.EqualValues(t, 10, scalar.Data[0][1])
	request.RequestType = qbtypes.RequestTypeRaw
	request.CompositeQuery.Queries[0].Spec = qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{Name: "R", Signal: telemetrytypes.SignalLogs, Filter: &qbtypes.Filter{Expression: `space_id = 'space-a'`}, SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "event_name"}, {Name: "attributes"}}}
	result, err = q.QueryRange(ctx, org, request)
	require.NoError(t, err)
	raw := result.Data.Results[0].(*qbtypes.RawData)
	require.Len(t, raw.Rows, 2)
	require.Equal(t, start.Add(2*time.Second).UnixNano(), raw.Rows[0].Timestamp.UnixNano())
	require.Equal(t, "tool.call", raw.Rows[0].Data["event_name"])
	attributes, ok := raw.Rows[0].Data["attributes"].(telemetrystoretypes.JSONValue)
	require.True(t, ok, "attributes must remain a JSON object")
	require.EqualValues(t, 7, attributes["tokens"])
	values, complete, err := metadata.GetAllValues(ctx, org, &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{Signal: telemetrytypes.SignalLogs, Name: "user_id", StartUnixMilli: start.UnixMilli(), EndUnixMilli: start.Add(time.Minute).UnixMilli()}, ExistingQuery: `space_id = 'space-a'`})
	require.NoError(t, err)
	require.True(t, complete)
	require.Equal(t, []string{"user-a"}, values.StringValues)
	request.CompositeQuery.Queries[0].Spec = qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Name: "T", Signal: telemetrytypes.SignalTraces, Filter: &qbtypes.Filter{Expression: `space_id = 'space-a'`}, SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "trace_id"}, {Name: "events"}, {Name: "links"}, {Name: "attributes"}}}
	result, err = q.QueryRange(ctx, org, request)
	require.NoError(t, err)
	traceData := result.Data.Results[0].(*qbtypes.RawData)
	require.Len(t, traceData.Rows, 1)
	events := traceData.Rows[0].Data["events"].([]spantypes.EventV2)
	require.Len(t, events, 1)
	require.Equal(t, uint64(1789000000123456789), events[0].TimeUnixNano)
	require.Equal(t, []spantypes.Link{{TraceID: "other-trace", SpanID: "other-span"}}, traceData.Rows[0].Data["links"])
	request.RequestType = qbtypes.RequestTypeTimeSeries
	request.CompositeQuery.Queries[0].Spec = qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "M", Signal: telemetrytypes.SignalMetrics, StepInterval: qbtypes.Step{Duration: time.Minute}, Filter: &qbtypes.Filter{Expression: `space_id = 'space-a'`}, Aggregations: []qbtypes.MetricAggregation{{MetricName: "test.gauge", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg}}}
	result, err = q.QueryRange(ctx, org, request)
	require.NoError(t, err)
	require.Len(t, result.Data.Results, 1)
	ts := result.Data.Results[0].(*qbtypes.TimeSeriesData)
	require.Len(t, ts.Aggregations, 1)
	require.Len(t, ts.Aggregations[0].Series, 1)
	require.Equal(t, float64(6), ts.Aggregations[0].Series[0].Values[0].Value)
	t.Run("result limit rejects partial aggregates", func(t *testing.T) {
		limitedCfg := cfg.TelemetryStore
		limitedCfg.OceanBase.MaxResultRows = 2
		limitedStore, err := oceanbasetelemetrystore.New(ctx, settings, limitedCfg)
		require.NoError(t, err)
		defer limitedStore.(interface{ Close() error }).Close()
		result, err := querier.ExecuteStatement(ctx, limitedStore, &qbtypes.Statement{
			Query: "SELECT value AS __result_0 FROM `" + prefix + "_metric_samples` WHERE org_id = ? LIMIT 3", Args: []any{org.StringValue()},
		}, querier.StatementExecution{Name: "limited", Kind: qbtypes.RequestTypeScalar})
		require.ErrorContains(t, err, "row result limit")
		require.Nil(t, result)
	})
	// The legacy escape hatch must not fall back to a ClickHouse connection.
	_, err = store.ClickhouseDB().Query(ctx, "SELECT 1")
	require.ErrorContains(t, err, "not supported")
}
