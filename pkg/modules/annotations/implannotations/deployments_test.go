package implannotations

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func serviceFilterClause(value string) *sqlbuilder.WhereClause {
	clause := sqlbuilder.NewWhereClause()
	cond := sqlbuilder.NewCond()
	clause.AddWhereExpr(cond.Args, cond.Equal("simpleJSONExtractString(labels, 'service.name')", value))
	return clause
}

// withServiceFilter inserts the service predicate into both resource passes of an unfiltered golden.
func withServiceFilter(golden string) string {
	golden = strings.Replace(golden, "seen_at_ts_bucket_start <= t2)", "seen_at_ts_bucket_start <= t2 AND simpleJSONExtractString(labels, 'service.name') = ?)", 1)
	return strings.Replace(golden, "min_bucket FROM first_bucket))", "min_bucket FROM first_bucket) AND simpleJSONExtractString(labels, 'service.name') = ?)", 1)
}

func TestBuildTracesDeploymentsQuery(t *testing.T) {
	noFilter := "WITH toInt64(intDiv(?, 1000)) AS t1, toInt64(intDiv(?, 1000)) AS t2, toInt64(intDiv(t1, 1800) * 1800) AS bt1, toInt64(?) AS r_bucket, fromUnixTimestamp64Milli(toInt64(?)) AS t1_dt, fromUnixTimestamp64Milli(toInt64(?)) AS t2_dt, " +
		"first_bucket AS (SELECT service, env, version, min(bucket) AS min_bucket FROM (SELECT simpleJSONExtractString(labels, 'service.name') AS service, simpleJSONExtractString(labels, 'deployment.environment') AS env, simpleJSONExtractString(labels, 'service.version') AS version, seen_at_ts_bucket_start AS bucket FROM signoz_traces.distributed_traces_v3_resource WHERE version != '' AND seen_at_ts_bucket_start <= t2) GROUP BY service, env, version HAVING min_bucket >= bt1 AND min_bucket > r_bucket), " +
		"cand AS (SELECT simpleJSONExtractString(labels, 'service.name') AS service, simpleJSONExtractString(labels, 'deployment.environment') AS env, simpleJSONExtractString(labels, 'service.version') AS version, seen_at_ts_bucket_start AS min_bucket, fingerprint AS fp, labels FROM signoz_traces.distributed_traces_v3_resource WHERE version != '' AND (service, env, version, seen_at_ts_bucket_start) GLOBAL IN (SELECT service, env, version, min_bucket FROM first_bucket)) " +
		"SELECT cand.service, cand.env, cand.version, min(raw_traces.timestamp) AS first_seen, argMin((raw_traces.trace_id, raw_traces.span_id), raw_traces.timestamp) AS first_ids, argMin(cand.labels, raw_traces.timestamp) AS labels FROM signoz_traces.distributed_signoz_index_v3 AS raw_traces GLOBAL INNER JOIN cand ON raw_traces.resource_fingerprint = cand.fp AND toInt64(raw_traces.ts_bucket_start) = cand.min_bucket WHERE (raw_traces.ts_bucket_start, raw_traces.resource_fingerprint) GLOBAL IN (SELECT toUInt64(min_bucket), fp FROM cand) GROUP BY cand.service, cand.env, cand.version HAVING first_seen >= t1_dt AND first_seen <= t2_dt ORDER BY first_seen"

	testCases := []struct {
		name     string
		filter   *sqlbuilder.WhereClause
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "NoFilter_Golden",
			filter:   sqlbuilder.NewWhereClause(),
			wantSQL:  noFilter,
			wantArgs: []any{int64(1700000000000), int64(1700003600000), int64(1699990000), int64(1700000000000), int64(1700003600000)},
		},
		{
			name:     "Filtered_ArgsInBothPasses",
			filter:   serviceFilterClause("cart"),
			wantSQL:  withServiceFilter(noFilter),
			wantArgs: []any{int64(1700000000000), int64(1700003600000), int64(1699990000), int64(1700000000000), int64(1700003600000), "cart", "cart"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sql, args := buildTracesDeploymentsQuery(testCase.filter, 1700000000000, 1700003600000, 1699990000)
			assert.Equal(t, testCase.wantSQL, sql)
			assert.Equal(t, testCase.wantArgs, args)
			assert.Equal(t, strings.Count(sql, "?"), len(args))
		})
	}
}

func TestBuildLogsDeploymentsQuery(t *testing.T) {
	noFilter := "WITH toInt64(intDiv(?, 1000)) AS t1, toInt64(intDiv(?, 1000)) AS t2, toInt64(intDiv(t1, 1800) * 1800) AS bt1, toInt64(?) AS r_bucket, toUInt64(?) * 1000000 AS t1_ns, toUInt64(?) * 1000000 AS t2_ns, " +
		"first_bucket AS (SELECT service, env, version, min(bucket) AS min_bucket FROM (SELECT simpleJSONExtractString(labels, 'service.name') AS service, simpleJSONExtractString(labels, 'deployment.environment') AS env, simpleJSONExtractString(labels, 'service.version') AS version, seen_at_ts_bucket_start AS bucket FROM signoz_logs.distributed_logs_v2_resource WHERE version != '' AND seen_at_ts_bucket_start <= t2) GROUP BY service, env, version HAVING min_bucket >= bt1 AND min_bucket > r_bucket), " +
		"cand AS (SELECT simpleJSONExtractString(labels, 'service.name') AS service, simpleJSONExtractString(labels, 'deployment.environment') AS env, simpleJSONExtractString(labels, 'service.version') AS version, seen_at_ts_bucket_start AS min_bucket, fingerprint AS fp, labels FROM signoz_logs.distributed_logs_v2_resource WHERE version != '' AND (service, env, version, seen_at_ts_bucket_start) GLOBAL IN (SELECT service, env, version, min_bucket FROM first_bucket)) " +
		"SELECT cand.service, cand.env, cand.version, min(raw_logs.timestamp) AS first_seen, argMin(raw_logs.id, raw_logs.timestamp) AS first_id, argMin(cand.labels, raw_logs.timestamp) AS labels FROM signoz_logs.distributed_logs_v2 AS raw_logs GLOBAL INNER JOIN cand ON raw_logs.resource_fingerprint = cand.fp AND toInt64(raw_logs.ts_bucket_start) = cand.min_bucket WHERE (raw_logs.ts_bucket_start, raw_logs.resource_fingerprint) GLOBAL IN (SELECT toUInt64(min_bucket), fp FROM cand) GROUP BY cand.service, cand.env, cand.version HAVING first_seen >= t1_ns AND first_seen <= t2_ns ORDER BY first_seen"

	testCases := []struct {
		name     string
		filter   *sqlbuilder.WhereClause
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "NoFilter_Golden",
			filter:   sqlbuilder.NewWhereClause(),
			wantSQL:  noFilter,
			wantArgs: []any{int64(1700000000000), int64(1700003600000), int64(1699990000), int64(1700000000000), int64(1700003600000)},
		},
		{
			name:     "Filtered_ArgsInBothPasses",
			filter:   serviceFilterClause("cart"),
			wantSQL:  withServiceFilter(noFilter),
			wantArgs: []any{int64(1700000000000), int64(1700003600000), int64(1699990000), int64(1700000000000), int64(1700003600000), "cart", "cart"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sql, args := buildLogsDeploymentsQuery(testCase.filter, 1700000000000, 1700003600000, 1699990000)
			assert.Equal(t, testCase.wantSQL, sql)
			assert.Equal(t, testCase.wantArgs, args)
			assert.Equal(t, strings.Count(sql, "?"), len(args))
		})
	}
}

func TestBuildHistoryEdgeQuery(t *testing.T) {
	assert.Equal(t, "SELECT min(seen_at_ts_bucket_start) FROM signoz_traces.distributed_traces_v3_resource", buildHistoryEdgeQuery(tracesTables))
	assert.Equal(t, "SELECT min(seen_at_ts_bucket_start) FROM signoz_logs.distributed_logs_v2_resource", buildHistoryEdgeQuery(logsTables))
}

func TestHistoryAvailableFromMs(t *testing.T) {
	assert.Equal(t, int64(1700001800000), historyAvailableFromMs(1700000000))
}

func TestResolveSignals(t *testing.T) {
	testCases := []struct {
		name string
		in   []telemetrytypes.Signal
		want []telemetrytypes.Signal
	}{
		{name: "Empty_Both", in: nil, want: []telemetrytypes.Signal{telemetrytypes.SignalTraces, telemetrytypes.SignalLogs}},
		{name: "LogsOnly_Logs", in: []telemetrytypes.Signal{telemetrytypes.SignalLogs}, want: []telemetrytypes.Signal{telemetrytypes.SignalLogs}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := resolveSignals(&annotationtypes.PostableAnnotations{Signals: testCase.in})
			require.Len(t, got, len(testCase.want))
			assert.Equal(t, testCase.want, got)
		})
	}
}
