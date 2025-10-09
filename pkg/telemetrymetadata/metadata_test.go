package telemetrymetadata

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

type regexMatcher struct {
}

func (m *regexMatcher) Match(expectedSQL, actualSQL string) error {
	re, err := regexp.Compile(expectedSQL)
	if err != nil {
		return err
	}
	if !re.MatchString(actualSQL) {
		return fmt.Errorf("expected query to contain %s, got %s", expectedSQL, actualSQL)
	}
	return nil
}

func TestGetKeys(t *testing.T) {
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
		DBName,
		AttributesMetadataLocalTableName,
	)

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
		inputMap       map[string][]*telemetrytypes.TelemetryFieldKey
		expectedKeys   []string
		notExpectedKey string
	}{
		{
			name: "bidirectional mapping: net.peer.name -> server.address",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address"},
		},
		{
			name: "bidirectional mapping: server.address -> net.peer.name",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"server.address": {
					{
						Name:          "server.address",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"server.address", "net.peer.name"},
		},
		{
			name: "bidirectional mapping: http.url -> url.full",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"http.url": {
					{
						Name:          "http.url",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"http.url", "url.full"},
		},
		{
			name: "bidirectional mapping: url.full -> http.url",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"url.full": {
					{
						Name:          "url.full",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"url.full", "http.url"},
		},
		{
			name: "alias already exists - should NOT override",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"server.address": {
					{
						Name:          "server.address",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
					},
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address"},
		},
		{
			name: "multiple keys with aliases",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"http.url": {
					{
						Name:          "http.url",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address", "http.url", "url.full"},
		},
		{
			name: "key without alias",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"custom.attribute": {
					{
						Name:          "custom.attribute",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys:   []string{"custom.attribute"},
			notExpectedKey: "server.address",
		},
		{
			name:         "empty map",
			inputMap:     map[string][]*telemetrytypes.TelemetryFieldKey{},
			expectedKeys: []string{},
		},
		{
			name: "logs signal - no backward compat mappings",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys:   []string{"net.peer.name"},
			notExpectedKey: "server.address",
		},
		{
			name: "metrics signal - no backward compat mappings",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalMetrics,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys:   []string{"net.peer.name"},
			notExpectedKey: "server.address",
		},
		{
			name: "field context and data type preservation",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
					},
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address"},
		},
		{
			name: "multiple entries for same key name with different signals",
			inputMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"net.peer.name": {
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "net.peer.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []string{"net.peer.name", "server.address"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testMap := make(map[string][]*telemetrytypes.TelemetryFieldKey)
			for k, v := range tt.inputMap {
				testMap[k] = append([]*telemetrytypes.TelemetryFieldKey{}, v...)
			}

			originalValues := make(map[string]*telemetrytypes.TelemetryFieldKey)
			for k, v := range testMap {
				if len(v) > 0 {
					originalValues[k] = v[0]
				}
			}

			applyBackwardCompatibleKeys(testMap)

			for _, expectedKey := range tt.expectedKeys {
				if _, exists := testMap[expectedKey]; !exists {
					t.Errorf("Expected key %q to exist in map, but it doesn't", expectedKey)
				}
			}

			if tt.notExpectedKey != "" {
				if _, exists := testMap[tt.notExpectedKey]; exists {
					t.Errorf("Did not expect key %q to exist in map, but it does", tt.notExpectedKey)
				}
			}

			for srcKey, srcKeys := range tt.inputMap {
				if len(srcKeys) == 0 {
					continue
				}
				srcKeyEntry := srcKeys[0]
				backwardCompatKeys := GetBackwardCompatKeysForSignal(srcKeyEntry.Signal)
				if aliasKey, ok := backwardCompatKeys[srcKey]; ok {
					_, existedBefore := tt.inputMap[aliasKey]
					if !existedBefore {
						if aliasEntries, exists := testMap[aliasKey]; exists && len(aliasEntries) > 0 {
							aliasEntry := aliasEntries[0]
							if aliasEntry.Signal != srcKeyEntry.Signal {
								t.Errorf("Expected alias %q to have signal %v, got %v", aliasKey, srcKeyEntry.Signal, aliasEntry.Signal)
							}
							if aliasEntry.FieldContext != srcKeyEntry.FieldContext {
								t.Errorf("Expected alias %q to have field context %v, got %v", aliasKey, srcKeyEntry.FieldContext, aliasEntry.FieldContext)
							}
							if aliasEntry.FieldDataType != srcKeyEntry.FieldDataType {
								t.Errorf("Expected alias %q to have field data type %v, got %v", aliasKey, srcKeyEntry.FieldDataType, aliasEntry.FieldDataType)
							}
						}
					}
				}
			}

			for k, originalValue := range originalValues {
				if currentEntries, exists := testMap[k]; exists && len(currentEntries) > 0 {
					currentValue := currentEntries[0]
					if currentValue.Signal != originalValue.Signal ||
						currentValue.FieldContext != originalValue.FieldContext ||
						currentValue.FieldDataType != originalValue.FieldDataType {
						t.Errorf("Original entry for key %q was modified", k)
					}
				}
			}
		})
	}
}
