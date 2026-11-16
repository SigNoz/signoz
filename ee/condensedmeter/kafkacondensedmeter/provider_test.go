package kafkacondensedmeter

import (
	"context"
	"fmt"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/twmb/franz-go/pkg/kfake"
	"github.com/twmb/franz-go/pkg/kgo"
	"go.opentelemetry.io/collector/pdata/pmetric"

	"github.com/SigNoz/signoz/pkg/condensedmeter"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes/condensedmetertypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
)

// Polls the topic until it has wantRecords records or the timeout passes.
func consumeMetrics(t *testing.T, brokers []string, topic string, wantRecords int, timeout time.Duration) []pmetric.Metrics {
	t.Helper()

	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumeTopics(topic),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	require.NoError(t, err)
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	metrics := []pmetric.Metrics{}
	for len(metrics) < wantRecords && ctx.Err() == nil {
		for _, record := range client.PollFetches(ctx).Records() {
			recordMetrics, err := (&pmetric.ProtoUnmarshaler{}).UnmarshalMetrics(record.Value)
			require.NoError(t, err)
			metrics = append(metrics, recordMetrics)
		}
	}

	return metrics
}

func TestReportOrg(t *testing.T) {
	orgID := valuer.GenerateUUID()
	now := time.Date(2026, 11, 12, 13, 30, 0, 0, time.UTC)
	checkpointHour := time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC)
	// 11:00 is closed at 13:30 (11:00 + 2h = 13:00); 12:00 is not (14:00)
	reportedHour := time.Date(2026, 11, 12, 11, 0, 0, 0, time.UTC)
	notFound := errors.New(errors.TypeNotFound, condensedmetertypes.ErrCodeCheckpointNotFound, "no checkpoint")
	condensedColumns := []cmock.ColumnType{{Name: "dimension_0", Type: "String"}, {Name: "dimension_1", Type: "String"}, {Name: "count", Type: "UInt64"}}
	manyRows := make([][]any, maxDataPointsPerRecord+1)
	manyDataPoints := make([]int64, maxDataPointsPerRecord+1)
	for i := range manyRows {
		manyRows[i] = []any{fmt.Sprintf("service-%d", i), "host-1", uint64(i + 1)}
		manyDataPoints[i] = int64(i + 1)
	}

	testCases := []struct {
		name              string
		checkpoint        *condensedmetertypes.Checkpoint
		firstIngestedMs   int64
		condensedRows     [][]any
		condensedErr      error
		expectedUpsert    *time.Time
		expectedRecords   int
		expectedDataPoint []int64
		expectedErr       bool
	}{
		{
			name:            "NoCheckpointNoIngestedRows_NothingReported",
			firstIngestedMs: 0,
		},
		{
			name:              "Checkpoint_ClosedHourSentAndCheckpointAdvanced",
			checkpoint:        condensedmetertypes.NewCheckpoint(orgID, checkpointHour),
			condensedRows:     [][]any{{"frontend", "host-1", uint64(31)}, {"checkout", "", uint64(4)}},
			expectedUpsert:    &reportedHour,
			expectedRecords:   1,
			expectedDataPoint: []int64{31, 4},
		},
		{
			name:              "Checkpoint_LargeHourSplitAcrossRecords",
			checkpoint:        condensedmetertypes.NewCheckpoint(orgID, checkpointHour),
			condensedRows:     manyRows,
			expectedUpsert:    &reportedHour,
			expectedRecords:   2,
			expectedDataPoint: manyDataPoints,
		},
		{
			name:           "Checkpoint_EmptyHourNotSentCheckpointAdvanced",
			checkpoint:     condensedmetertypes.NewCheckpoint(orgID, checkpointHour),
			condensedRows:  [][]any{},
			expectedUpsert: &reportedHour,
		},
		{
			name:         "Checkpoint_QueryFails_CheckpointNotAdvanced",
			checkpoint:   condensedmetertypes.NewCheckpoint(orgID, checkpointHour),
			condensedErr: errors.New(errors.TypeInternal, errors.CodeInternal, "clickhouse down"),
			expectedErr:  true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			cluster, err := kfake.NewCluster(kfake.NumBrokers(1), kfake.SeedTopics(1, "tenant_meter"))
			require.NoError(t, err)
			defer cluster.Close()

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
			store := condensedmetertypestest.NewMockStore(t)
			if testCase.checkpoint != nil {
				store.EXPECT().Get(mock.Anything, orgID).Return(testCase.checkpoint, nil)
			} else {
				store.EXPECT().Get(mock.Anything, orgID).Return(nil, notFound)
				telemetryStore.Mock().ExpectQueryRow(regexp.QuoteMeta("min(unix_milli)")).
					WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "min", Type: "Int64"}}, []any{testCase.firstIngestedMs}))
			}

			if testCase.condensedRows != nil || testCase.condensedErr != nil {
				query := telemetryStore.Mock().ExpectQuery(regexp.QuoteMeta("distributed_time_series_v4_reduced")).
					WithArgs(reportedHour.UnixMilli(), reportedHour.Add(time.Hour).UnixMilli(), reportedHour.UnixMilli(), reportedHour.Add(time.Hour).UnixMilli(), reportedHour.UnixMilli(), reportedHour.Add(time.Hour).UnixMilli())
				if testCase.condensedErr != nil {
					query.WillReturnError(testCase.condensedErr)
				} else {
					query.WillReturnRows(cmock.NewRows(condensedColumns, testCase.condensedRows))
				}
			}

			if testCase.expectedUpsert != nil {
				store.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(checkpoint *condensedmetertypes.Checkpoint) bool {
					return checkpoint.OrgID == orgID && checkpoint.LastReportedHour.Equal(*testCase.expectedUpsert)
				})).Return(nil)
			}

			config := condensedmeter.Config{
				Provider:   "kafka",
				Interval:   time.Hour,
				Dimensions: []string{"service.name", "host.name"},
				Kafka:      condensedmeter.KafkaConfig{Brokers: cluster.ListenAddrs(), Topic: "tenant_meter", ClientID: "signoz-test", Compression: "none"},
			}
			provider, err := newProvider(context.Background(), instrumentationtest.New().ToProviderSettings(), config, nil, nil, nil, telemetryStore, store, version.Info)
			require.NoError(t, err)
			defer provider.client.Close()

			err = provider.reportOrg(context.Background(), orgID, now)
			if testCase.expectedErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
			}

			assert.NoError(t, telemetryStore.Mock().ExpectationsWereMet())

			metrics := consumeMetrics(t, cluster.ListenAddrs(), "tenant_meter", testCase.expectedRecords+1, 500*time.Millisecond)
			require.Len(t, metrics, testCase.expectedRecords)

			dataPoints := []int64{}
			for _, recordMetrics := range metrics {
				points := recordMetrics.ResourceMetrics().At(0).ScopeMetrics().At(0).Metrics().At(0).Sum().DataPoints()
				for i := 0; i < points.Len(); i++ {
					dataPoints = append(dataPoints, points.At(i).IntValue())
					assert.Equal(t, now, points.At(i).Timestamp().AsTime())
				}
			}
			assert.ElementsMatch(t, testCase.expectedDataPoint, dataPoints)
		})
	}
}
