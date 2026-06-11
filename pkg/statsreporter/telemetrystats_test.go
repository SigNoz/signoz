package statsreporter

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
)

// Exact SQL the count queries must generate; see the matching last-observed
// constants in handler_test.go.
const (
	tracesCountSQL  = "SELECT COUNT(*) FROM signoz_traces.distributed_signoz_index_v3"
	logsCountSQL    = "SELECT COUNT(*) FROM signoz_logs.distributed_logs_v2"
	metricsCountSQL = "SELECT COUNT(*) FROM signoz_metrics.distributed_samples_v4"
)

func TestTelemetryStatsCollectorCollect(t *testing.T) {
	collector, chMock := newTelemetryStatsCollectorTest(t)

	tracesAt := time.Date(2026, 6, 10, 10, 0, 0, 0, time.UTC)
	logsAt := time.Date(2026, 6, 10, 11, 0, 0, 0, time.UTC)
	metricsAt := time.Date(2026, 6, 10, 12, 0, 0, 0, time.UTC)

	expectTelemetryCount(chMock, tracesCountSQL, 5)
	expectTelemetryCount(chMock, logsCountSQL, 7)
	expectTelemetryCount(chMock, metricsCountSQL, 9)
	expectTracesLastIngested(chMock, tracesAt)
	expectLogsLastIngested(chMock, logsAt)
	expectMetricsLastIngested(chMock, metricsAt)

	stats, err := collector.Collect(context.Background(), testOrgID)

	require.NoError(t, err)
	assert.Equal(t, uint64(5), stats["telemetry.traces.count"])
	assert.Equal(t, uint64(7), stats["telemetry.logs.count"])
	assert.Equal(t, uint64(9), stats["telemetry.metrics.count"])
	assert.Equal(t, tracesAt, stats["telemetry.traces.last_observed.time"])
	assert.Equal(t, tracesAt.Unix(), stats["telemetry.traces.last_observed.time_unix"])
	assert.Equal(t, logsAt, stats["telemetry.logs.last_observed.time"])
	assert.Equal(t, logsAt.Unix(), stats["telemetry.logs.last_observed.time_unix"])
	assert.Equal(t, metricsAt, stats["telemetry.metrics.last_observed.time"])
	assert.Equal(t, metricsAt.Unix(), stats["telemetry.metrics.last_observed.time_unix"])
}

func TestTelemetryStatsCollectorOmitsQuietLastObserved(t *testing.T) {
	collector, chMock := newTelemetryStatsCollectorTest(t)

	expectTelemetryCount(chMock, tracesCountSQL, 0)
	expectTelemetryCount(chMock, logsCountSQL, 0)
	expectTelemetryCount(chMock, metricsCountSQL, 0)
	expectTracesLastIngested(chMock, time.Time{})
	expectLogsLastIngested(chMock, time.Time{})
	expectMetricsLastIngested(chMock, time.Time{})

	stats, err := collector.Collect(context.Background(), testOrgID)

	require.NoError(t, err)
	assert.Equal(t, map[string]any{
		"telemetry.traces.count":  uint64(0),
		"telemetry.logs.count":    uint64(0),
		"telemetry.metrics.count": uint64(0),
	}, stats)
	assert.NoError(t, chMock.ExpectationsWereMet())
}

func TestTelemetryStatsCollectorCountErrorFails(t *testing.T) {
	collector, chMock := newTelemetryStatsCollectorTest(t)

	chMock.ExpectQueryRow(regexp.QuoteMeta(tracesCountSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "count()", Type: "UInt64"}}, nil)).
		WillReturnError(assert.AnError)

	stats, err := collector.Collect(context.Background(), testOrgID)

	assert.Error(t, err)
	assert.Nil(t, stats)
}

func TestTelemetryStatsCollectorLastObservedErrorFails(t *testing.T) {
	collector, chMock := newTelemetryStatsCollectorTest(t)

	expectTelemetryCount(chMock, tracesCountSQL, 1)
	expectTelemetryCount(chMock, logsCountSQL, 1)
	expectTelemetryCount(chMock, metricsCountSQL, 1)
	chMock.ExpectQueryRow(regexp.QuoteMeta(tracesLastObservedSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "max(timestamp)", Type: "DateTime64(9)"}}, nil)).
		WillReturnError(assert.AnError)

	stats, err := collector.Collect(context.Background(), testOrgID)

	assert.Error(t, err)
	assert.Nil(t, stats)
}

func newTelemetryStatsCollectorTest(t *testing.T) (StatsCollector, cmock.ClickConnMockCommon) {
	t.Helper()

	ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	ts.Mock().MatchExpectationsInOrder(false)

	return NewTelemetryStatsCollector(ts), ts.Mock()
}

func expectTelemetryCount(mock cmock.ClickConnMockCommon, query string, count uint64) {
	mock.ExpectQueryRow(regexp.QuoteMeta(query)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "count()", Type: "UInt64"}}, []any{count}))
}
