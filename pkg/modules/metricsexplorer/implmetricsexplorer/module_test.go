package implmetricsexplorer_test

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer/implmetricsexplorer"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

const (
	// fixed, deterministic time window (range < 6h so the table selectors resolve
	// to stable table names that the expected SQL strings can hard-code).
	testStartMillis                int64 = 1700000000000
	testEndMillis                  int64 = 1700003600000 // +1h
	statsNoFilterSQL                     = "WITH __time_series_counts AS (SELECT metric_name, uniq(fingerprint) AS timeseries FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? GROUP BY metric_name), __sample_counts AS (SELECT metric_name, count(*) AS samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND metric_name IN (SELECT DISTINCT metric_name FROM signoz_metrics.time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ?) GROUP BY metric_name) SELECT COALESCE(ts.metric_name, s.metric_name) AS metric_name, COALESCE(ts.timeseries, 0) AS timeseries, COALESCE(s.samples, 0) AS samples, COUNT(*) OVER() AS total FROM __time_series_counts ts FULL OUTER JOIN __sample_counts s ON ts.metric_name = s.metric_name WHERE (COALESCE(ts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) > 0) ORDER BY samples DESC, metric_name ASC LIMIT ? OFFSET ?"
	statsOrderTimeseriesSQL              = "WITH __time_series_counts AS (SELECT metric_name, uniq(fingerprint) AS timeseries FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? GROUP BY metric_name), __sample_counts AS (SELECT metric_name, count(*) AS samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND metric_name IN (SELECT DISTINCT metric_name FROM signoz_metrics.time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ?) GROUP BY metric_name) SELECT COALESCE(ts.metric_name, s.metric_name) AS metric_name, COALESCE(ts.timeseries, 0) AS timeseries, COALESCE(s.samples, 0) AS samples, COUNT(*) OVER() AS total FROM __time_series_counts ts FULL OUTER JOIN __sample_counts s ON ts.metric_name = s.metric_name WHERE (COALESCE(ts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) > 0) ORDER BY timeseries ASC, metric_name ASC LIMIT ? OFFSET ?"
	statsWithFilterSQL                   = "WITH __time_series_counts AS (SELECT metric_name, uniq(fingerprint) AS timeseries FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY metric_name), __filtered_fingerprints AS (SELECT fingerprint FROM signoz_metrics.time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY fingerprint), __sample_counts AS (SELECT metric_name, count(*) AS samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints) GROUP BY metric_name) SELECT COALESCE(ts.metric_name, s.metric_name) AS metric_name, COALESCE(ts.timeseries, 0) AS timeseries, COALESCE(s.samples, 0) AS samples, COUNT(*) OVER() AS total FROM __time_series_counts ts FULL OUTER JOIN __sample_counts s ON ts.metric_name = s.metric_name WHERE (COALESCE(ts.timeseries, 0) > 0 OR COALESCE(s.samples, 0) > 0) ORDER BY samples DESC, metric_name ASC LIMIT ? OFFSET ?"
	treemapTimeseriesNoFilterSQL         = "WITH __total_time_series AS (SELECT uniq(fingerprint) AS total_time_series FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND __normalized = ?), __metric_totals AS (SELECT metric_name, uniq(fingerprint) AS total_value FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? GROUP BY metric_name) SELECT mt.metric_name, mt.total_value, CASE WHEN tts.total_time_series = 0 THEN 0 ELSE (mt.total_value * 100.0 / tts.total_time_series) END AS percentage FROM __metric_totals mt JOIN __total_time_series tts ON 1=1 ORDER BY percentage DESC LIMIT ?"
	treemapTimeseriesWithFilterSQL       = "WITH __total_time_series AS (SELECT uniq(fingerprint) AS total_time_series FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND __normalized = ?), __metric_totals AS (SELECT metric_name, uniq(fingerprint) AS total_value FROM signoz_metrics.distributed_time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY metric_name) SELECT mt.metric_name, mt.total_value, CASE WHEN tts.total_time_series = 0 THEN 0 ELSE (mt.total_value * 100.0 / tts.total_time_series) END AS percentage FROM __metric_totals mt JOIN __total_time_series tts ON 1=1 ORDER BY percentage DESC LIMIT ?"
	treemapSamplesNoFilterSQL            = "WITH __metric_candidates AS (SELECT metric_name FROM signoz_metrics.distributed_time_series_v4 WHERE NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND unix_milli BETWEEN ? AND ? GROUP BY metric_name ORDER BY uniq(fingerprint) DESC LIMIT ?), __sample_counts AS (SELECT metric_name, count(*) AS samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ? AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates) GROUP BY metric_name), __total_samples AS (SELECT count(*) AS total_samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ?) SELECT mc.metric_name, COALESCE(sc.samples, 0) AS samples, CASE WHEN ts.total_samples = 0 THEN 0 ELSE (COALESCE(sc.samples, 0) * 100.0 / ts.total_samples) END AS percentage FROM __metric_candidates mc LEFT JOIN __sample_counts sc ON mc.metric_name = sc.metric_name JOIN __total_samples ts ON 1=1 ORDER BY percentage DESC LIMIT ?"
	treemapSamplesWithFilterSQL          = "WITH __metric_candidates AS (SELECT metric_name FROM signoz_metrics.distributed_time_series_v4 WHERE NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND unix_milli BETWEEN ? AND ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY metric_name ORDER BY uniq(fingerprint) DESC LIMIT ?), __filtered_fingerprints AS (SELECT fingerprint FROM signoz_metrics.time_series_v4 WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates) GROUP BY fingerprint), __sample_counts AS (SELECT metric_name, count(*) AS samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ? AND metric_name GLOBAL IN (SELECT metric_name FROM __metric_candidates) AND fingerprint IN (SELECT fingerprint FROM __filtered_fingerprints) GROUP BY metric_name), __total_samples AS (SELECT count(*) AS total_samples FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli BETWEEN ? AND ?) SELECT mc.metric_name, COALESCE(sc.samples, 0) AS samples, CASE WHEN ts.total_samples = 0 THEN 0 ELSE (COALESCE(sc.samples, 0) * 100.0 / ts.total_samples) END AS percentage FROM __metric_candidates mc LEFT JOIN __sample_counts sc ON mc.metric_name = sc.metric_name JOIN __total_samples ts ON 1=1 ORDER BY percentage DESC LIMIT ?"
)

var testOrgID = valuer.GenerateUUID()

type statsOpt func(*metricsexplorertypes.StatsRequest)

type treemapOpt func(*metricsexplorertypes.TreemapRequest)

// newTestModule builds the metricsexplorer module backed by a mocked clickhouse
// connection, a mock metadata store, and an in-memory cache.
func newTestModule(t *testing.T, matcher sqlmock.QueryMatcher) (metricsexplorer.Module, cmock.ClickConnMockCommon, *telemetrytypestest.MockMetadataStore) {
	t.Helper()

	ts := telemetrystoretest.New(telemetrystore.Config{}, matcher)
	md := telemetrytypestest.NewMockMetadataStore()
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: cache.Memory{NumCounters: 1000, MaxCost: 1 << 20}})
	if err != nil {
		t.Fatalf("cachetest.New: %v", err)
	}

	settings := instrumentationtest.New().ToProviderSettings()
	mod := implmetricsexplorer.NewModule(ts, md, c, nil /*ruleStore*/, nil /*dashboardModule*/, settings, metricsexplorer.Config{})

	return mod, ts.Mock(), md
}

func statsRequest(opts ...statsOpt) *metricsexplorertypes.StatsRequest {
	req := &metricsexplorertypes.StatsRequest{
		Start: testStartMillis,
		End:   testEndMillis,
		Limit: 10,
	}
	for _, o := range opts {
		o(req)
	}
	return req
}

func withStatsFilter(expr string) statsOpt {
	return func(req *metricsexplorertypes.StatsRequest) {
		req.Filter = &qbtypes.Filter{Expression: expr}
	}
}

func withStatsLimit(limit int) statsOpt {
	return func(req *metricsexplorertypes.StatsRequest) {
		req.Limit = limit
	}
}

func withStatsOrderBy(name string, dir qbtypes.OrderDirection) statsOpt {
	return func(req *metricsexplorertypes.StatsRequest) {
		req.OrderBy = &qbtypes.OrderBy{
			Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name}},
			Direction: dir,
		}
	}
}

func treemapRequest(mode metricsexplorertypes.TreemapMode, opts ...treemapOpt) *metricsexplorertypes.TreemapRequest {
	req := &metricsexplorertypes.TreemapRequest{
		Start: testStartMillis,
		End:   testEndMillis,
		Limit: 10,
		Mode:  mode,
	}
	for _, o := range opts {
		o(req)
	}
	return req
}

func withTreemapFilter(expr string) treemapOpt {
	return func(req *metricsexplorertypes.TreemapRequest) {
		req.Filter = &qbtypes.Filter{Expression: expr}
	}
}

// seedFilterKey registers a string attribute field so buildFilterClause can
// resolve it when parsing a filter expression that references it.
func seedFilterKey(md *telemetrytypestest.MockMetadataStore, name string) {
	md.KeysMap[name] = []*telemetrytypes.TelemetryFieldKey{
		{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
	}
}

// anyArgs returns n nil wildcards. cmock treats a nil expected arg as a match
// for any actual value, so this asserts only the bound-arg count, not values
// (the SQL text itself is what we verify). The count must match the query.
func anyArgs(n int) []any {
	return make([]any, n)
}

func treemapEntryRows() *cmock.Rows {
	return cmock.NewRows(
		[]cmock.ColumnType{
			{Name: "metric_name", Type: "String"},
			{Name: "total_value", Type: "UInt64"},
			{Name: "percentage", Type: "Float64"},
		},
		[][]any{
			{"metric_a", uint64(50), 50.0},
			{"metric_b", uint64(30), 30.0},
		},
	)
}

func TestGetStats(t *testing.T) {
	tests := []struct {
		name      string
		opts      []statsOpt
		seedKey   string
		queryErr  error
		expectSQL string
		argCount  int
		noQuery   bool // SQL never reaches clickhouse (validation/build error)
		wantCode  errors.Code
	}{
		{name: "NoFilter_FastPathSQL", expectSQL: statsNoFilterSQL, argCount: 10},
		{name: "WhitespaceFilter_FastPathSQL", opts: []statsOpt{withStatsFilter("   ")}, expectSQL: statsNoFilterSQL, argCount: 10},
		{name: "WithFilter_FingerprintSQL", opts: []statsOpt{withStatsFilter("host.name = 'foo'")}, seedKey: "host.name", expectSQL: statsWithFilterSQL, argCount: 12},
		{name: "OrderByTimeseriesAsc", opts: []statsOpt{withStatsOrderBy("timeseries", qbtypes.OrderDirectionAsc)}, expectSQL: statsOrderTimeseriesSQL, argCount: 10},
		{name: "OrderByInvalid", opts: []statsOpt{withStatsOrderBy("nonsense", qbtypes.OrderDirectionAsc)}, noQuery: true, wantCode: errors.CodeInvalidInput},
		{name: "QueryError", queryErr: assert.AnError, expectSQL: statsNoFilterSQL, argCount: 10, wantCode: errors.CodeInternal},
		{name: "InvalidRequest_Limit", opts: []statsOpt{withStatsLimit(0)}, noQuery: true, wantCode: errors.CodeInvalidInput},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mod, mock, md := newTestModule(t, sqlmock.QueryMatcherRegexp)
			if tc.seedKey != "" {
				seedFilterKey(md, tc.seedKey)
			}

			if !tc.noQuery {
				eq := mock.ExpectQuery(regexp.QuoteMeta(tc.expectSQL)).WithArgs(anyArgs(tc.argCount)...)
				if tc.queryErr != nil {
					eq.WillReturnError(tc.queryErr)
				} else {
					eq.WillReturnRows(cmock.NewRows(nil, nil))
				}
			}

			_, err := mod.GetStats(context.Background(), testOrgID, statsRequest(tc.opts...))
			if tc.wantCode.String() != "" {
				assert.Error(t, err)
				assert.Truef(t, errors.Asc(err, tc.wantCode), "want code %s, got %v", tc.wantCode, err)
				return
			}
			assert.NoError(t, err)
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestGetTreemap(t *testing.T) {
	wantEntries := []metricsexplorertypes.TreemapEntry{
		{MetricName: "metric_a", TotalValue: 50, Percentage: 50.0},
		{MetricName: "metric_b", TotalValue: 30, Percentage: 30.0},
	}

	tests := []struct {
		name        string
		mode        metricsexplorertypes.TreemapMode
		opts        []treemapOpt
		seedKey     string
		queryErr    error
		expectSQL   string
		argCount    int
		rows        *cmock.Rows
		wantSamples []metricsexplorertypes.TreemapEntry
		wantTS      []metricsexplorertypes.TreemapEntry
		noQuery     bool
		wantCode    errors.Code
		wantErr     bool
	}{
		{name: "TimeSeries_NoFilter_SQL", mode: metricsexplorertypes.TreemapModeTimeSeries, expectSQL: treemapTimeseriesNoFilterSQL, argCount: 7},
		{name: "TimeSeries_WithFilter_SQL", mode: metricsexplorertypes.TreemapModeTimeSeries, opts: []treemapOpt{withTreemapFilter("host.name = 'foo'")}, seedKey: "host.name", expectSQL: treemapTimeseriesWithFilterSQL, argCount: 8},
		{name: "TimeSeries_ScansEntries", mode: metricsexplorertypes.TreemapModeTimeSeries, expectSQL: treemapTimeseriesNoFilterSQL, argCount: 7, rows: treemapEntryRows(), wantTS: wantEntries},
		{name: "Samples_NoFilter_SQL", mode: metricsexplorertypes.TreemapModeSamples, expectSQL: treemapSamplesNoFilterSQL, argCount: 9},
		{name: "Samples_WithFilter_SQL", mode: metricsexplorertypes.TreemapModeSamples, opts: []treemapOpt{withTreemapFilter("host.name = 'foo'")}, seedKey: "host.name", expectSQL: treemapSamplesWithFilterSQL, argCount: 14},
		{name: "Samples_ScansEntries", mode: metricsexplorertypes.TreemapModeSamples, expectSQL: treemapSamplesNoFilterSQL, argCount: 9, rows: treemapEntryRows(), wantSamples: wantEntries},
		{name: "FilterBuildError", mode: metricsexplorertypes.TreemapModeTimeSeries, opts: []treemapOpt{withTreemapFilter("host.name =")}, noQuery: true, wantErr: true},
		{name: "QueryError", mode: metricsexplorertypes.TreemapModeTimeSeries, queryErr: assert.AnError, expectSQL: treemapTimeseriesNoFilterSQL, argCount: 7, wantCode: errors.CodeInternal},
		{name: "InvalidMode", mode: metricsexplorertypes.TreemapMode{}, noQuery: true, wantCode: errors.CodeInvalidInput},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mod, mock, md := newTestModule(t, sqlmock.QueryMatcherRegexp)
			if tc.seedKey != "" {
				seedFilterKey(md, tc.seedKey)
			}

			if !tc.noQuery {
				eq := mock.ExpectQuery(regexp.QuoteMeta(tc.expectSQL)).WithArgs(anyArgs(tc.argCount)...)
				switch {
				case tc.queryErr != nil:
					eq.WillReturnError(tc.queryErr)
				case tc.rows != nil:
					eq.WillReturnRows(tc.rows)
				default:
					eq.WillReturnRows(cmock.NewRows(nil, nil))
				}
			}

			resp, err := mod.GetTreemap(context.Background(), testOrgID, treemapRequest(tc.mode, tc.opts...))
			switch {
			case tc.wantCode.String() != "":
				assert.Error(t, err)
				assert.Truef(t, errors.Asc(err, tc.wantCode), "want code %s, got %v", tc.wantCode, err)
				return
			case tc.wantErr:
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.NoError(t, mock.ExpectationsWereMet())
			if tc.wantTS != nil {
				assert.Equal(t, tc.wantTS, resp.TimeSeries)
			}
			if tc.wantSamples != nil {
				assert.Equal(t, tc.wantSamples, resp.Samples)
			}
		})
	}
}
