package statsreporter

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/emptystatetypes"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var testOrgID = valuer.MustNewUUID("00000000-0000-0000-0000-000000000001")

// Exact SQL the query builders must generate; mock expectations match on these
// so any change to the statements fails the suite.
const (
	logsLastObservedSQL    = "SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM signoz_logs.distributed_logs_v2"
	tracesLastObservedSQL  = "SELECT max(timestamp) FROM signoz_traces.distributed_signoz_index_v3"
	metricsLastObservedSQL = "SELECT toDateTime(max(unix_milli) / 1000) FROM signoz_metrics.distributed_samples_v4"
)

func infraMetricsProbeSQL() string {
	placeholders := strings.TrimSuffix(strings.Repeat("?, ", len(infraMetricNames)), ", ")
	return fmt.Sprintf("SELECT 1 FROM signoz_metrics.distributed_metadata WHERE last_reported_unix_milli >= ? AND last_reported_unix_milli <= ? AND metric_name IN (%s) LIMIT ?", placeholders)
}

type fakeCollector struct {
	stats map[string]any
	err   error
}

func (f *fakeCollector) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return f.stats, f.err
}

func okCollectors() OrgContextCollectors {
	return OrgContextCollectors{
		Rules:      &fakeCollector{stats: map[string]any{ruletypes.StatKeyRuleCount: int64(0)}},
		Dashboards: &fakeCollector{stats: map[string]any{dashboardtypes.StatKeyDashboardCount: int64(0)}},
		SavedViews: &fakeCollector{stats: map[string]any{savedviewtypes.StatKeySavedViewCount: int64(0)}},
		Licensing:  &fakeCollector{stats: map[string]any{}},
	}
}

func TestLicenseStatusFromStats(t *testing.T) {
	cases := []struct {
		name  string
		stats map[string]any
		want  emptystatetypes.LicenseStatus
	}{
		{
			name:  "known state passes through",
			stats: map[string]any{licensetypes.StatKeyLicenseStateName: "ACTIVATED"},
			want:  emptystatetypes.LicenseStatus("ACTIVATED"),
		},
		{
			name:  "novel state passes through",
			stats: map[string]any{licensetypes.StatKeyLicenseStateName: "FUTURE_STATE"},
			want:  emptystatetypes.LicenseStatus("FUTURE_STATE"),
		},
		{
			name:  "missing key returns unknown",
			stats: map[string]any{},
			want:  emptystatetypes.LicenseStatusUnknown,
		},
		{
			name:  "blank state returns unknown",
			stats: map[string]any{licensetypes.StatKeyLicenseStateName: "  "},
			want:  emptystatetypes.LicenseStatusUnknown,
		},
		{
			name:  "non-string state returns unknown",
			stats: map[string]any{licensetypes.StatKeyLicenseStateName: 42},
			want:  emptystatetypes.LicenseStatusUnknown,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status := licenseStatusFromStats(tc.stats)
			assert.Equal(t, tc.want, status)
		})
	}
}

func TestGetLicenseStatusDegradesToUnknown(t *testing.T) {
	t.Run("collector error", func(t *testing.T) {
		h := &handler{collectors: OrgContextCollectors{Licensing: &fakeCollector{err: assert.AnError}}}

		status := h.getLicenseStatus(context.Background(), testOrgID)

		assert.Equal(t, emptystatetypes.LicenseStatusUnknown, status)
	})

	t.Run("nil collector", func(t *testing.T) {
		h := &handler{}

		status := h.getLicenseStatus(context.Background(), testOrgID)

		assert.Equal(t, emptystatetypes.LicenseStatusUnknown, status)
	})
}

func TestGetCollectedCount(t *testing.T) {
	h := &handler{}

	t.Run("missing key fails", func(t *testing.T) {
		_, err := h.getCollectedCount(context.Background(), &fakeCollector{stats: map[string]any{}}, ruletypes.StatKeyRuleCount, testOrgID)

		assert.Error(t, err)
	})

	t.Run("nil collector fails", func(t *testing.T) {
		_, err := h.getCollectedCount(context.Background(), nil, ruletypes.StatKeyRuleCount, testOrgID)

		assert.Error(t, err)
	})
}

func TestGetHasInfraMetrics(t *testing.T) {
	t.Run("InfraMetricNamesProbe_GeneratesExpectedSQL", func(t *testing.T) {
		ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
		h := &handler{telemetryStore: ts}
		now := time.Unix(2000, 0)

		expectInfraMetrics(ts.Mock(), true)

		hasInfraMetrics, err := h.getHasInfraMetrics(context.Background(), now)

		require.NoError(t, err)
		assert.True(t, hasInfraMetrics)
		// The probe list spans host/pod/node tables in both dot and underscore forms.
		assert.Contains(t, infraMetricNames, "k8s.node.cpu.usage")
		assert.Contains(t, infraMetricNames, "k8s_node_cpu_usage")
		assert.Contains(t, infraMetricNames, "k8s.pod.cpu.usage")
		assert.Contains(t, infraMetricNames, inframonitoringtypes.HostsTableMetricNames[0])
		assert.NoError(t, ts.Mock().ExpectationsWereMet())
	})
}

func TestGetOrgContextDerivesAggregates(t *testing.T) {
	lastIngested := time.Unix(5000, 0).UTC()

	cases := []struct {
		name    string
		logs    bool
		traces  bool
		metrics bool
	}{
		{name: "logs only", logs: true},
		{name: "traces only", traces: true},
		{name: "metrics only", metrics: true},
		{name: "nothing ingested"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h, chMock := newOrgContextTestHandler(t, OrgContextCollectors{
				Rules:      &fakeCollector{stats: map[string]any{ruletypes.StatKeyRuleCount: int64(2)}},
				Dashboards: &fakeCollector{stats: map[string]any{dashboardtypes.StatKeyDashboardCount: int64(1)}},
				SavedViews: &fakeCollector{stats: map[string]any{savedviewtypes.StatKeySavedViewCount: int64(3)}},
				Licensing:  &fakeCollector{stats: map[string]any{licensetypes.StatKeyLicenseStateName: "ACTIVATED"}},
			})

			if tc.logs {
				expectLogsLastIngested(chMock, lastIngested)
			} else {
				expectLogsLastIngested(chMock, time.Time{})
			}
			if tc.traces {
				expectTracesLastIngested(chMock, lastIngested)
			} else {
				expectTracesLastIngested(chMock, time.Time{})
			}
			if tc.metrics {
				expectMetricsLastIngested(chMock, lastIngested)
			} else {
				expectMetricsLastIngested(chMock, time.Time{})
			}
			expectInfraMetrics(chMock, false)

			orgContext, err := h.getOrgContext(context.Background(), testOrgID)

			require.NoError(t, err)
			assert.Equal(t, tc.logs || tc.traces || tc.metrics, orgContext.HasIngestedData)
			assertLastIngested(t, tc.logs, orgContext.LastIngestedAt.Logs, lastIngested)
			assertLastIngested(t, tc.traces, orgContext.LastIngestedAt.Traces, lastIngested)
			assertLastIngested(t, tc.metrics, orgContext.LastIngestedAt.Metrics, lastIngested)
			assert.False(t, orgContext.HasInfraMetrics)
			assert.Equal(t, 2, orgContext.AlertsCount)
			assert.Equal(t, 1, orgContext.DashboardsCount)
			assert.Equal(t, 3, orgContext.SavedViewsCount)
			assert.Equal(t, emptystatetypes.LicenseStatus("ACTIVATED"), orgContext.LicenseStatus)
			assert.NoError(t, chMock.ExpectationsWereMet())
		})
	}
}

func assertLastIngested(t *testing.T, ingested bool, got *time.Time, want time.Time) {
	t.Helper()

	if !ingested {
		assert.Nil(t, got)
		return
	}

	require.NotNil(t, got)
	assert.Equal(t, want, *got)
}

func TestGetOrgContextLicenseErrorDoesNotFail(t *testing.T) {
	collectors := okCollectors()
	collectors.Licensing = &fakeCollector{err: assert.AnError}
	h, chMock := newOrgContextTestHandler(t, collectors)

	expectTelemetryQuiet(chMock)

	orgContext, err := h.getOrgContext(context.Background(), testOrgID)

	require.NoError(t, err)
	assert.Equal(t, emptystatetypes.LicenseStatusUnknown, orgContext.LicenseStatus)
	assert.NoError(t, chMock.ExpectationsWereMet())
}

func TestGetOrgContextCollectorErrorFails(t *testing.T) {
	collectors := okCollectors()
	collectors.Rules = &fakeCollector{err: assert.AnError}
	h, chMock := newOrgContextTestHandler(t, collectors)

	expectTelemetryQuiet(chMock)

	orgContext, err := h.getOrgContext(context.Background(), testOrgID)

	assert.Error(t, err)
	assert.Nil(t, orgContext)
}

func TestGetOrgContextClickHouseErrorFails(t *testing.T) {
	h, chMock := newOrgContextTestHandler(t, okCollectors())

	chMock.ExpectQueryRow(regexp.QuoteMeta(logsLastObservedSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "max(timestamp)", Type: "DateTime64(9)"}}, nil)).
		WillReturnError(assert.AnError)
	expectTracesLastIngested(chMock, time.Time{})
	expectMetricsLastIngested(chMock, time.Time{})
	expectInfraMetrics(chMock, false)

	orgContext, err := h.getOrgContext(context.Background(), testOrgID)

	assert.Error(t, err)
	assert.Nil(t, orgContext)
}

func newOrgContextTestHandler(t *testing.T, collectors OrgContextCollectors) (*handler, cmock.ClickConnMockCommon) {
	t.Helper()

	ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	ts.Mock().MatchExpectationsInOrder(false)

	return &handler{
		telemetryStore: ts,
		collectors:     collectors,
	}, ts.Mock()
}

func expectTelemetryQuiet(mock cmock.ClickConnMockCommon) {
	expectLogsLastIngested(mock, time.Time{})
	expectTracesLastIngested(mock, time.Time{})
	expectMetricsLastIngested(mock, time.Time{})
	expectInfraMetrics(mock, false)
}

func expectLogsLastIngested(mock cmock.ClickConnMockCommon, lastIngestedAt time.Time) {
	mock.ExpectQueryRow(regexp.QuoteMeta(logsLastObservedSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "max(timestamp)", Type: "DateTime64(9)"}}, []any{lastIngestedAt}))
}

func expectTracesLastIngested(mock cmock.ClickConnMockCommon, lastIngestedAt time.Time) {
	mock.ExpectQueryRow(regexp.QuoteMeta(tracesLastObservedSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "max(timestamp)", Type: "DateTime64(9)"}}, []any{lastIngestedAt}))
}

func expectMetricsLastIngested(mock cmock.ClickConnMockCommon, lastIngestedAt time.Time) {
	mock.ExpectQueryRow(regexp.QuoteMeta(metricsLastObservedSQL)).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "toDateTime(divide(max(unix_milli), 1000))", Type: "DateTime"}}, []any{lastIngestedAt}))
}

func expectInfraMetrics(mock cmock.ClickConnMockCommon, exists bool) {
	row := cmock.NewRow([]cmock.ColumnType{{Name: "exists", Type: "UInt8"}}, nil)
	if exists {
		row = cmock.NewRow([]cmock.ColumnType{{Name: "exists", Type: "UInt8"}}, []any{uint8(1)})
	}

	mock.ExpectQueryRow(regexp.QuoteMeta(infraMetricsProbeSQL())).WillReturnRow(row)
}
