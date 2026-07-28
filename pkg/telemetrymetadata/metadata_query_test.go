package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetryaudit"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type regexMatcher struct {
}

func (m *regexMatcher) Match(expectedSQL, actualSQL string) error {
	re, err := regexp.Compile(expectedSQL)
	if err != nil {
		return err
	}
	if !re.MatchString(actualSQL) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expected query to contain %s, got %s", expectedSQL, actualSQL)
	}
	return nil
}

func TestGetFirstSeenFromMetricMetadata(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanAttributesKeysTblName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrymeter.DBName,
		telemetrymeter.SamplesAgg1dTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrylogs.LogAttributeKeysTblName,
		telemetrylogs.LogResourceKeysTblName,
		telemetryaudit.DBName,
		telemetryaudit.AuditLogsTableName,
		telemetryaudit.TagAttributesTableName,
		telemetryaudit.LogAttributeKeysTblName,
		telemetryaudit.LogResourceKeysTblName,
		DBName,
		AttributesMetadataTableName,
		ColumnEvolutionMetadataTableName,
		flaggertest.New(t),
	)

	lookupKeys := []telemetrytypes.MetricMetadataLookupKey{
		{
			MetricName:     "metric1",
			AttributeName:  "attr1",
			AttributeValue: "val1",
		},
		{
			MetricName:     "metric2",
			AttributeName:  "attr2",
			AttributeValue: "val2",
		},
	}

	// ClickHouse tuple syntax is (x, y, z)
	// the structure should lead to:
	// SELECT ... WHERE (metric_name, attr_name, attr_string_value) IN ((?, ?, ?), (?, ?, ?)) ...

	expectedQuery := `SELECT metric_name, attr_name, attr_string_value, min\(first_reported_unix_milli\) AS first_seen FROM signoz_metrics.distributed_metadata WHERE \(metric_name, attr_name, attr_string_value\) IN \(\(\?, \?, \?\), \(\?, \?, \?\)\) GROUP BY metric_name, attr_name, attr_string_value ORDER BY first_seen`

	// Note: regexMatcher uses regexp.MatchString, so we escape parens and ?

	mock.ExpectQuery(expectedQuery).
		WithArgs("metric1", "attr1", "val1", "metric2", "attr2", "val2").
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "metric_name", Type: "String"},
			{Name: "attr_name", Type: "String"},
			{Name: "attr_string_value", Type: "String"},
			{Name: "first_seen", Type: "UInt64"},
		}, [][]any{
			{"metric1", "attr1", "val1", uint64(1000)},
			{"metric2", "attr2", "val2", uint64(2000)},
		}))

	result, err := metadata.GetFirstSeenFromMetricMetadata(context.Background(), lookupKeys)
	require.NoError(t, err)

	assert.Equal(t, int64(1000), result[lookupKeys[0]])
	assert.Equal(t, int64(2000), result[lookupKeys[1]])

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

// Sum metrics are classified as counters unless they are non-monotonic AND
// cumulative; monotonicity carries no meaning for delta sums, so a
// non-monotonic delta sum must remain a Sum (counter).
func TestFetchTemporalityAndTypeMultiSumClassification(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanAttributesKeysTblName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrymeter.DBName,
		telemetrymeter.SamplesAgg1dTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrylogs.LogAttributeKeysTblName,
		telemetrylogs.LogResourceKeysTblName,
		telemetryaudit.DBName,
		telemetryaudit.AuditLogsTableName,
		telemetryaudit.TagAttributesTableName,
		telemetryaudit.LogAttributeKeysTblName,
		telemetryaudit.LogResourceKeysTblName,
		DBName,
		AttributesMetadataTableName,
		ColumnEvolutionMetadataTableName,
		flaggertest.New(t),
	)

	metricNames := []string{
		"delta.nonmono.sum",
		"delta.mono.sum",
		"cumulative.nonmono.sum",
		"cumulative.mono.sum",
	}

	metadataCols := []cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
		{Name: "temporality", Type: "String"},
		{Name: "type", Type: "String"},
		{Name: "is_monotonic", Type: "Bool"},
	}

	mock.ExpectQuery(`SELECT metric_name, temporality, any\(type\) AS type, argMax\(is_monotonic, unix_milli\) as is_monotonic FROM signoz_metrics\.`).
		WithArgs(nil, nil, nil).
		WillReturnRows(cmock.NewRows(metadataCols, [][]any{
			{"delta.nonmono.sum", metrictypes.Delta, metrictypes.SumType, false},
			{"delta.mono.sum", metrictypes.Delta, metrictypes.SumType, true},
			{"cumulative.nonmono.sum", metrictypes.Cumulative, metrictypes.SumType, false},
			{"cumulative.mono.sum", metrictypes.Cumulative, metrictypes.SumType, true},
		}))
	mock.ExpectQuery(`SELECT metric_name, argMax\(temporality, unix_milli\) as temporality, any\(type\) AS type, argMax\(is_monotonic, unix_milli\) as is_monotonic FROM signoz_meter\.`).
		WithArgs(nil).
		WillReturnRows(cmock.NewRows(metadataCols, [][]any{}))

	temporalities, types, _, err := metadata.FetchTemporalityAndTypeMulti(
		context.Background(),
		valuer.GenerateUUID(),
		1700000000000,
		1700003600000,
		metricNames...,
	)
	require.NoError(t, err)

	assert.Equal(t, metrictypes.SumType, types["delta.nonmono.sum"])
	assert.Equal(t, metrictypes.SumType, types["delta.mono.sum"])
	assert.Equal(t, metrictypes.GaugeType, types["cumulative.nonmono.sum"])
	assert.Equal(t, metrictypes.SumType, types["cumulative.mono.sum"])

	assert.Equal(t, metrictypes.Delta, temporalities["delta.nonmono.sum"])
	assert.Equal(t, metrictypes.Cumulative, temporalities["cumulative.nonmono.sum"])

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
