package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
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

func TestGetAllValuesContextPrefixedName(t *testing.T) {
	testCases := []struct {
		name         string
		signal       telemetrytypes.Signal
		keyText      string
		table        string
		keyCondition string
		keyArgs      []any
	}{
		{
			name:         "LogPrefix_MatchesLogFieldOrPrefixedName",
			signal:       telemetrytypes.SignalLogs,
			keyText:      "log.file.path",
			table:        "signoz_logs.distributed_tag_attributes_v2",
			keyCondition: "((tag_key = ? AND tag_type = ?) OR tag_key = ?)",
			keyArgs:      []any{"file.path", "logfield", "log.file.path"},
		},
		{
			name:         "ResourcePrefix_MatchesResourceOrPrefixedName",
			signal:       telemetrytypes.SignalLogs,
			keyText:      "resource.k8s.pod.name",
			table:        "signoz_logs.distributed_tag_attributes_v2",
			keyCondition: "((tag_key = ? AND tag_type = ?) OR tag_key = ?)",
			keyArgs:      []any{"k8s.pod.name", "resource", "resource.k8s.pod.name"},
		},
		{
			name:         "SpanPrefix_MatchesSpanFieldOrPrefixedName",
			signal:       telemetrytypes.SignalTraces,
			keyText:      "span.queue.name",
			table:        "signoz_traces.distributed_tag_attributes_v2",
			keyCondition: "((tag_key = ? AND tag_type = ?) OR tag_key = ?)",
			keyArgs:      []any{"queue.name", "spanfield", "span.queue.name"},
		},
		{
			name:         "NoPrefix_MatchesNameAlone",
			signal:       telemetrytypes.SignalLogs,
			keyText:      "host.name",
			table:        "signoz_logs.distributed_tag_attributes_v2",
			keyCondition: "tag_key = ?",
			keyArgs:      []any{"host.name"},
		},
	}

	fl := flaggertest.New(t)
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
			mock := mockTelemetryStore.Mock()
			metadata := NewTelemetryMetaStore(instrumentationtest.New().ToProviderSettings(), mockTelemetryStore, fl)

			selector := telemetrytypes.NewFieldValueSelectorFromPostableFieldValueParams(telemetrytypes.PostableFieldValueParams{
				PostableFieldKeysParams: telemetrytypes.PostableFieldKeysParams{Signal: testCase.signal},
				Name:                    testCase.keyText,
			})

			mock.ExpectQuery(regexp.QuoteMeta("SELECT 1 FROM " + testCase.table + " WHERE " + testCase.keyCondition + " AND tag_data_type = ? LIMIT ?")).
				WithArgs(append(append([]any{}, testCase.keyArgs...), "bool", 1)...).
				WillReturnRows(cmock.NewRows([]cmock.ColumnType{{Name: "1", Type: "UInt8"}}, [][]any{}))
			mock.ExpectQuery(regexp.QuoteMeta("SELECT DISTINCT string_value, number_value FROM " + testCase.table + " WHERE " + testCase.keyCondition + " AND tag_data_type <> ? LIMIT ?")).
				WithArgs(append(append([]any{}, testCase.keyArgs...), "bool", 51)...).
				WillReturnRows(cmock.NewRows([]cmock.ColumnType{
					{Name: "string_value", Type: "String"},
					{Name: "number_value", Type: "Float64"},
				}, [][]any{{"/var/log/journal", float64(0)}}))

			values, complete, err := metadata.GetAllValues(context.Background(), valuer.GenerateUUID(), selector)
			require.NoError(t, err)

			assert.Equal(t, []string{"/var/log/journal"}, values.StringValues)
			assert.True(t, complete)
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
