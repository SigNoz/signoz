package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"
	"time"

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
		ColumnEvolutionMetadataTableName,
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

var (
	clickHouseQueryPatternWithFieldName    = "SELECT.*signal.*column_name.*column_type.*field_context.*field_name.*release_time.*FROM.*distributed_column_evolution_metadata.*WHERE.*signal.*=.*field_context.*=.*field_name.*=.*field_name.*=.*"
	clickHouseQueryPatternWithoutFieldName = "SELECT.*signal.*column_name.*column_type.*field_context.*field_name.*release_time.*FROM.*distributed_column_evolution_metadata.*WHERE.*signal.*=.*field_context.*=.*ORDER BY.*release_time.*ASC"
	clickHouseColumns                      = []cmock.ColumnType{
		{Name: "signal", Type: "String"},
		{Name: "column_name", Type: "String"},
		{Name: "column_type", Type: "String"},
		{Name: "field_context", Type: "String"},
		{Name: "field_name", Type: "String"},
		{Name: "release_time", Type: "UInt64"},
	}
)

func createMockRows(values [][]any) *cmock.Rows {
	return cmock.NewRows(clickHouseColumns, values)
}

func TestKeyEvolutionMetadata_Get_Multi_FetchFromClickHouse(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	values := [][]any{
		{
			"logs",
			"resources_string",
			"Map(LowCardinality(String), String)",
			"resource",
			"__all__",
			uint64(releaseTime.UnixNano()),
		},
	}

	selector := &telemetrytypes.EvolutionSelector{
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	rows := createMockRows(values)
	mock.ExpectQuery(clickHouseQueryPatternWithoutFieldName).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextResource).WillReturnRows(rows)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	result, err := metadata.GetColumnEvolutionMetadataMulti(ctx, []*telemetrytypes.EvolutionSelector{selector})
	require.NoError(t, err)

	expectedKey := "logs:resource:__all__"
	require.Contains(t, result, expectedKey)
	require.Len(t, result[expectedKey], 1)
	assert.Equal(t, telemetrytypes.SignalLogs, result[expectedKey][0].Signal)
	assert.Equal(t, "resources_string", result[expectedKey][0].ColumnName)
	assert.Equal(t, "Map(LowCardinality(String), String)", result[expectedKey][0].ColumnType)
	assert.Equal(t, telemetrytypes.FieldContextResource, result[expectedKey][0].FieldContext)
	assert.Equal(t, "__all__", result[expectedKey][0].FieldName)
	assert.Equal(t, releaseTime.UnixNano(), result[expectedKey][0].ReleaseTime.UnixNano())

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestKeyEvolutionMetadata_Get_Multi_MultipleMetadataEntries(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	releaseTime1 := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTime2 := time.Date(2024, 2, 15, 10, 0, 0, 0, time.UTC)

	values := [][]any{
		{
			"logs",
			"resources_string",
			"Map(LowCardinality(String), String)",
			"resource",
			"__all__",
			uint64(releaseTime1.UnixNano()),
		},
		{
			"logs",
			"resource",
			"JSON()",
			"resource",
			"__all__",
			uint64(releaseTime2.UnixNano()),
		},
	}

	rows := createMockRows(values)
	mock.ExpectQuery(clickHouseQueryPatternWithoutFieldName).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextResource).WillReturnRows(rows)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	selector := &telemetrytypes.EvolutionSelector{
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextResource,
	}
	result, err := metadata.GetColumnEvolutionMetadataMulti(ctx, []*telemetrytypes.EvolutionSelector{selector})
	require.NoError(t, err)

	expectedKey := "logs:resource:__all__"
	require.Contains(t, result, expectedKey)
	require.Len(t, result[expectedKey], 2)
	assert.Equal(t, "resources_string", result[expectedKey][0].ColumnName)
	assert.Equal(t, "Map(LowCardinality(String), String)", result[expectedKey][0].ColumnType)
	assert.Equal(t, "resource", result[expectedKey][0].FieldContext.StringValue())
	assert.Equal(t, "__all__", result[expectedKey][0].FieldName)
	assert.Equal(t, releaseTime1.UnixNano(), result[expectedKey][0].ReleaseTime.UnixNano())
	assert.Equal(t, "resource", result[expectedKey][1].ColumnName)
	assert.Equal(t, "JSON()", result[expectedKey][1].ColumnType)
	assert.Equal(t, "resource", result[expectedKey][1].FieldContext.StringValue())
	assert.Equal(t, "__all__", result[expectedKey][1].FieldName)
	assert.Equal(t, releaseTime2.UnixNano(), result[expectedKey][1].ReleaseTime.UnixNano())

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestKeyEvolutionMetadata_Get_Multi_MultipleMetadataEntriesWithFieldName(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	releaseTime1 := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTime2 := time.Date(2024, 2, 15, 10, 0, 0, 0, time.UTC)
	releaseTime3 := time.Date(2024, 3, 15, 10, 0, 0, 0, time.UTC)

	values := [][]any{
		{
			"logs",
			"body",
			"String",
			"body",
			"__all__",
			uint64(releaseTime1.UnixNano()),
		},
		{
			"logs",
			"body_json",
			"JSON()",
			"body",
			"__all__",
			uint64(releaseTime2.UnixNano()),
		},
		{
			"logs",
			"body_promoted",
			"JSON()",
			"body",
			"user.name",
			uint64(releaseTime3.UnixNano()),
		},
	}

	selector := &telemetrytypes.EvolutionSelector{
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextBody,
		FieldName:    "user.name",
	}

	rows := createMockRows(values)
	mock.ExpectQuery(clickHouseQueryPatternWithFieldName).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextBody, selector.FieldName, "__all__").WillReturnRows(rows)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	result, err := metadata.GetColumnEvolutionMetadataMulti(ctx, []*telemetrytypes.EvolutionSelector{selector})
	require.NoError(t, err)

	// Check entries for "__all__" field name
	expectedKeyAll := "logs:body:__all__"
	require.Contains(t, result, expectedKeyAll)
	require.Len(t, result[expectedKeyAll], 2)
	assert.Equal(t, "body", result[expectedKeyAll][0].ColumnName)
	assert.Equal(t, "String", result[expectedKeyAll][0].ColumnType)
	assert.Equal(t, "body", result[expectedKeyAll][0].FieldContext.StringValue())
	assert.Equal(t, "__all__", result[expectedKeyAll][0].FieldName)
	assert.Equal(t, releaseTime1.UnixNano(), result[expectedKeyAll][0].ReleaseTime.UnixNano())
	assert.Equal(t, "body_json", result[expectedKeyAll][1].ColumnName)
	assert.Equal(t, "JSON()", result[expectedKeyAll][1].ColumnType)
	assert.Equal(t, "body", result[expectedKeyAll][1].FieldContext.StringValue())
	assert.Equal(t, "__all__", result[expectedKeyAll][1].FieldName)
	assert.Equal(t, releaseTime2.UnixNano(), result[expectedKeyAll][1].ReleaseTime.UnixNano())

	// Check entries for "user.name" field name
	expectedKeyUser := "logs:body:user.name"
	require.Contains(t, result, expectedKeyUser)
	require.Len(t, result[expectedKeyUser], 1)
	assert.Equal(t, "body_promoted", result[expectedKeyUser][0].ColumnName)
	assert.Equal(t, "JSON()", result[expectedKeyUser][0].ColumnType)
	assert.Equal(t, "body", result[expectedKeyUser][0].FieldContext.StringValue())
	assert.Equal(t, "user.name", result[expectedKeyUser][0].FieldName)
	assert.Equal(t, releaseTime3.UnixNano(), result[expectedKeyUser][0].ReleaseTime.UnixNano())

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestKeyEvolutionMetadata_Get_Multi_MultipleMetadataEntriesWithMultipleSelectors(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	// releaseTime1 := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTime2 := time.Date(2024, 2, 15, 10, 0, 0, 0, time.UTC)
	releaseTime3 := time.Date(2024, 3, 15, 10, 0, 0, 0, time.UTC)

	values := [][]any{
		{
			"logs",
			"body_json",
			"JSON()",
			"body",
			"__all__",
			uint64(releaseTime2.UnixNano()),
		},
		{
			"logs",
			"body_promoted",
			"JSON()",
			"body",
			"user.name",
			uint64(releaseTime3.UnixNano()),
		},
		{
			"traces",
			"resources_string",
			"map()",
			telemetrytypes.FieldContextResource,
			"__all__",
			uint64(releaseTime2.UnixNano()),
		},
		{
			telemetrytypes.SignalTraces,
			"resource",
			"JSON()",
			telemetrytypes.FieldContextResource,
			"__all__",
			uint64(releaseTime3.UnixNano()),
		},
	}

	selectors := []*telemetrytypes.EvolutionSelector{
		{
			Signal:       telemetrytypes.SignalLogs,
			FieldContext: telemetrytypes.FieldContextBody,
			FieldName:    "user.name",
		},
		{
			Signal:       telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "service.name",
		},
	}

	query := `SELECT signal, column_name, column_type, field_context, field_name, release_time FROM signoz_metadata\.distributed_column_evolution_metadata WHERE ` +
		`\(\(signal = \? AND \(field_context = \? AND \(field_name = \? OR field_name = \?\)\)\) OR ` +
		`\(signal = \? AND \(field_context = \? AND \(field_name = \? OR field_name = \?\)\)\)\) ` +
		`ORDER BY release_time ASC`
	rows := createMockRows(values)
	mock.ExpectQuery(query).WithArgs(
		telemetrytypes.SignalLogs, telemetrytypes.FieldContextBody, selectors[0].FieldName, "__all__",
		telemetrytypes.SignalTraces, telemetrytypes.FieldContextResource, selectors[1].FieldName, "__all__",
	).WillReturnRows(rows)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	_, err := metadata.GetColumnEvolutionMetadataMulti(ctx, selectors)
	require.NoError(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestKeyEvolutionMetadata_Get_Multi_EmptyResultFromClickHouse(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	rows := createMockRows([][]any{})
	mock.ExpectQuery(clickHouseQueryPatternWithoutFieldName).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextResource).WillReturnRows(rows)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	selector := &telemetrytypes.EvolutionSelector{
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextResource,
	}
	result, err := metadata.GetColumnEvolutionMetadataMulti(ctx, []*telemetrytypes.EvolutionSelector{selector})
	require.NoError(t, err)

	assert.Empty(t, result)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestKeyEvolutionMetadata_Get_Multi_ClickHouseQueryError(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	mock.ExpectQuery(clickHouseQueryPatternWithoutFieldName).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextResource).WillReturnError(assert.AnError)

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	selector := &telemetrytypes.EvolutionSelector{
		Signal:       telemetrytypes.SignalLogs,
		FieldContext: telemetrytypes.FieldContextResource,
	}
	_, err := metadata.GetColumnEvolutionMetadataMulti(ctx, []*telemetrytypes.EvolutionSelector{selector})
	require.Error(t, err)
}

func TestKeyEvolutionMetadata_Get_Multi_MultipleSelectors(t *testing.T) {
	ctx := context.Background()

	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := telemetryStore.Mock()

	releaseTime1 := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTime2 := time.Date(2024, 2, 15, 10, 0, 0, 0, time.UTC)

	values := [][]any{
		{
			telemetrytypes.SignalLogs,
			"resources_string",
			"Map(LowCardinality(String), String)",
			telemetrytypes.FieldContextResource,
			"__all__",
			uint64(releaseTime1.UnixNano()),
		},
		{
			telemetrytypes.SignalLogs,
			"body",
			"JSON()",
			telemetrytypes.FieldContextBody,
			"__all__",
			uint64(releaseTime2.UnixNano()),
		},
	}

	// When multiple selectors are provided, the query will have OR conditions
	// The pattern should match queries with multiple OR clauses
	queryPattern := "SELECT.*signal.*column_name.*column_type.*field_context.*field_name.*release_time.*FROM.*distributed_column_evolution_metadata.*WHERE.*ORDER BY.*release_time.*ASC"
	rows := createMockRows(values)
	mock.ExpectQuery(queryPattern).WillReturnRows(rows).WithArgs(telemetrytypes.SignalLogs, telemetrytypes.FieldContextResource, "__all__", "__all__", telemetrytypes.SignalLogs, telemetrytypes.FieldContextBody, "__all__", "__all__")

	metadata := newTestTelemetryMetaStoreTestHelper(telemetryStore)
	selectors := []*telemetrytypes.EvolutionSelector{
		{
			Signal:       telemetrytypes.SignalLogs,
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "__all__",
		},
		{
			Signal:       telemetrytypes.SignalLogs,
			FieldContext: telemetrytypes.FieldContextBody,
			FieldName:    "__all__",
		},
	}
	result, err := metadata.GetColumnEvolutionMetadataMulti(ctx, selectors)
	require.NoError(t, err)

	// Should have entries for both selectors
	expectedKey1 := "logs:resource:__all__"
	expectedKey2 := "logs:body:__all__"
	require.Contains(t, result, expectedKey1)
	require.Contains(t, result, expectedKey2)
	require.Len(t, result[expectedKey1], 1)
	require.Len(t, result[expectedKey2], 1)
	assert.Equal(t, "resources_string", result[expectedKey1][0].ColumnName)
	assert.Equal(t, "body", result[expectedKey2][0].ColumnName)

	require.NoError(t, mock.ExpectationsWereMet())
}
