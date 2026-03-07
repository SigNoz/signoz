package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestTelemetryMetaStoreTestHelper(store telemetrystore.TelemetryStore) telemetrytypes.MetadataStore {
	return NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		store,
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
		DBName,
		AttributesMetadataLocalTableName,
	)
}

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

func TestGetKeys(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := newTestTelemetryMetaStoreTestHelper(mockTelemetryStore)

	rows := cmock.NewRows([]cmock.ColumnType{
		{Name: "statement", Type: "String"},
	}, [][]any{{"CREATE TABLE signoz_traces.signoz_index_v3"}})

	mock.
		ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").
		WillReturnRows(rows)

	query := `SELECT.*`

	mock.ExpectQuery(query).
		WithArgs("%http.method%", telemetrytypes.FieldDataTypeString.TagDataType(), 11).
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "tag_key", Type: "String"},
			{Name: "tag_type", Type: "String"},
			{Name: "tag_data_type", Type: "String"},
			{Name: "priority", Type: "UInt8"},
		}, [][]any{{"http.method", "tag", "String", 1}, {"http.method", "tag", "String", 1}}))
	keys, _, err := metadata.GetKeys(context.Background(), &telemetrytypes.FieldKeySelector{
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Name:          "http.method",
		Limit:         10,
	})

	if err != nil {
		t.Fatalf("Failed to get keys: %v", err)
	}

	t.Logf("Keys: %v", keys)
}

func TestApplyBackwardCompatibleKeys(t *testing.T) {
	tests := []struct {
		name           string
		inputKeys      []*telemetrytypes.TelemetryFieldKey
		expectedKeys   []string
		notExpectedKey string
	}{
		{
			name: "bidirectional mapping: net.peer.name -> server.address",
			inputKeys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          "net.peer.name",
					Signal:        telemetrytypes.SignalTraces,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address"},
		},
		{
			name: "bidirectional mapping: server.address -> net.peer.name",
			inputKeys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          "server.address",
					Signal:        telemetrytypes.SignalTraces,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedKeys: []string{"server.address", "net.peer.name"},
		},
		{
			name: "bidirectional mapping: http.url -> url.full",
			inputKeys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          "http.url",
					Signal:        telemetrytypes.SignalTraces,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedKeys: []string{"http.url", "url.full"},
		},
		{
			name: "bidirectional mapping: url.full -> http.url",
			inputKeys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          "url.full",
					Signal:        telemetrytypes.SignalTraces,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedKeys: []string{"url.full", "http.url"},
		},
		{
			name: "key without alias",
			inputKeys: []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          "custom.attribute",
					Signal:        telemetrytypes.SignalTraces,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedKeys:   []string{"custom.attribute"},
			notExpectedKey: "server.address",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
			mock := mockTelemetryStore.Mock()

			metadata := newTestTelemetryMetaStoreTestHelper(mockTelemetryStore)

			hasTraces := false
			hasLogs := false
			for _, key := range tt.inputKeys {
				if key.Signal == telemetrytypes.SignalTraces {
					hasTraces = true
				} else if key.Signal == telemetrytypes.SignalLogs {
					hasLogs = true
				}
			}

			if hasTraces {
				mock.ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").
					WillReturnRows(cmock.NewRows([]cmock.ColumnType{
						{Name: "statement", Type: "String"},
					}, [][]any{{"CREATE TABLE signoz_traces.signoz_index_v3"}}))

				var args []interface{}
				var rows [][]any
				for _, key := range tt.inputKeys {
					if key.Signal == telemetrytypes.SignalTraces {
						tagType := "tag"
						if key.FieldContext == telemetrytypes.FieldContextResource {
							tagType = "resource"
						}
						args = append(args, "%"+key.Name+"%", tagType, key.FieldDataType.TagDataType())
						rows = append(rows, []any{key.Name, tagType, key.FieldDataType.TagDataType(), 1})
					}
				}
				args = append(args, 11)

				mock.ExpectQuery(`SELECT.*`).
					WithArgs(args...).
					WillReturnRows(cmock.NewRows([]cmock.ColumnType{
						{Name: "tag_key", Type: "String"},
						{Name: "tag_type", Type: "String"},
						{Name: "tag_data_type", Type: "String"},
						{Name: "priority", Type: "UInt8"},
					}, rows))
			}

			if hasLogs {
				var args []interface{}
				var rows [][]any
				for _, key := range tt.inputKeys {
					if key.Signal == telemetrytypes.SignalLogs {
						tagType := "tag"
						if key.FieldContext == telemetrytypes.FieldContextResource {
							tagType = "resource"
						}
						args = append(args, "%"+key.Name+"%", tagType, key.FieldDataType.TagDataType())
						rows = append(rows, []any{key.Name, tagType, key.FieldDataType.TagDataType(), 1})
					}
				}
				args = append(args, 11)

				mock.ExpectQuery(`SELECT.*`).
					WithArgs(args...).
					WillReturnRows(cmock.NewRows([]cmock.ColumnType{
						{Name: "tag_key", Type: "String"},
						{Name: "tag_type", Type: "String"},
						{Name: "tag_data_type", Type: "String"},
						{Name: "priority", Type: "UInt8"},
					}, rows))
			}

			selectors := []*telemetrytypes.FieldKeySelector{}
			for _, key := range tt.inputKeys {
				selectors = append(selectors, &telemetrytypes.FieldKeySelector{
					Signal:        key.Signal,
					FieldContext:  key.FieldContext,
					FieldDataType: key.FieldDataType,
					Name:          key.Name,
					Limit:         10,
				})
			}

			resultMap, _, err := metadata.GetKeysMulti(context.Background(), selectors)
			require.NoError(t, err, "GetKeysMulti should not return an error")

			for _, expectedKey := range tt.expectedKeys {
				assert.Contains(t, resultMap, expectedKey, "Expected key %q to exist in result map", expectedKey)
			}

			if tt.notExpectedKey != "" {
				assert.NotContains(t, resultMap, tt.notExpectedKey, "Did not expect key %q to exist in result map", tt.notExpectedKey)
			}

			for _, srcKey := range tt.inputKeys {
				backwardCompatKeys := GetBackwardCompatKeysForSignal(srcKey.Signal)
				if aliasKey, ok := backwardCompatKeys[srcKey.Name]; ok {
					aliasExistedInInput := false
					for _, inputKey := range tt.inputKeys {
						if inputKey.Name == aliasKey {
							aliasExistedInInput = true
							break
						}
					}

					if !aliasExistedInInput {
						if aliasEntries, exists := resultMap[aliasKey]; exists && len(aliasEntries) > 0 {
							aliasEntry := aliasEntries[0]
							assert.Equal(t, srcKey.Signal, aliasEntry.Signal, "Alias %q should have same signal", aliasKey)
							assert.Equal(t, srcKey.FieldContext, aliasEntry.FieldContext, "Alias %q should have same field context", aliasKey)
							assert.Equal(t, srcKey.FieldDataType, aliasEntry.FieldDataType, "Alias %q should have same field data type", aliasKey)
						}
					}
				}
			}

			require.NoError(t, mock.ExpectationsWereMet(), "All SQL expectations should be met")
		})
	}
}

func TestEnrichWithIntrinsicMetricKeys(t *testing.T) {
	result := enrichWithIntrinsicMetricKeys(
		map[string][]*telemetrytypes.TelemetryFieldKey{},
		[]*telemetrytypes.FieldKeySelector{
			{
				Signal:            telemetrytypes.SignalMetrics,
				Name:              "metric",
				SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
			},
		},
	)

	require.Contains(t, result, "metric_name")
	assert.Equal(t, telemetrytypes.FieldContextMetric, result["metric_name"][0].FieldContext)

	result = enrichWithIntrinsicMetricKeys(
		map[string][]*telemetrytypes.TelemetryFieldKey{},
		[]*telemetrytypes.FieldKeySelector{
			{
				Signal:            telemetrytypes.SignalMetrics,
				Name:              "metric",
				FieldContext:      telemetrytypes.FieldContextAttribute,
				SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
			},
		},
	)
	assert.NotContains(t, result, "metric_name")
}

func TestGetMetricFieldValuesIntrinsicMetricName(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := newTestTelemetryMetaStoreTestHelper(mockTelemetryStore)

	valueRows := cmock.NewRows([]cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
	}, [][]any{{"metric.a"}, {"metric.b"}})

	query := `SELECT .*metric_name.*` + telemetrymetrics.TimeseriesV41weekTableName + `.*GROUP BY.*metric_name`

	mock.ExpectQuery(query).
		WithArgs(51).
		WillReturnRows(valueRows)

	metadataRows := cmock.NewRows([]cmock.ColumnType{
		{Name: "attr_string_value", Type: "String"},
	}, [][]any{})

	mock.ExpectQuery(regexp.QuoteMeta("SELECT DISTINCT attr_string_value FROM signoz_metrics.distributed_metadata WHERE attr_name = ? LIMIT ?")).
		WithArgs("metric_name", 49).
		WillReturnRows(metadataRows)

	values, complete, err := metadata.(*telemetryMetaStore).getMetricFieldValues(context.Background(), &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Signal:            telemetrytypes.SignalMetrics,
			Name:              "metric_name",
			Limit:             50,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
		},
		Limit: 50,
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.ElementsMatch(t, []string{"metric.a", "metric.b"}, values.StringValues)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetMetricFieldValuesIntrinsicBoolReturnsEmpty(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := newTestTelemetryMetaStoreTestHelper(mockTelemetryStore)

	metadataRows := cmock.NewRows([]cmock.ColumnType{
		{Name: "attr_string_value", Type: "String"},
	}, [][]any{})

	mock.ExpectQuery(regexp.QuoteMeta("SELECT DISTINCT attr_string_value FROM signoz_metrics.distributed_metadata WHERE attr_name = ? AND attr_datatype = ? AND attr_string_value = ? LIMIT ?")).
		WithArgs("is_monotonic", telemetrytypes.FieldDataTypeBool.TagDataType(), "true", 11).
		WillReturnRows(metadataRows)

	values, complete, err := metadata.(*telemetryMetaStore).getMetricFieldValues(context.Background(), &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Signal:            telemetrytypes.SignalMetrics,
			Name:              "is_monotonic",
			FieldDataType:     telemetrytypes.FieldDataTypeBool,
			Limit:             10,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		},
		Value: "true",
		Limit: 10,
	})
	require.NoError(t, err)
	assert.True(t, complete)
	assert.Empty(t, values.StringValues)
	assert.Empty(t, values.BoolValues)
	require.NoError(t, mock.ExpectationsWereMet())
}
