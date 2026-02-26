package telemetrylogs

import (
	"context"
	"testing"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockKeyEvolutionMetadataStore is a mock implementation of KeyEvolutionMetadataStore for testing
type mockKeyEvolutionMetadataStore struct {
	metadata map[string][]*qbtypes.KeyEvolutionMetadataKey
}

func newMockKeyEvolutionMetadataStore() *mockKeyEvolutionMetadataStore {
	return &mockKeyEvolutionMetadataStore{
		metadata: make(map[string][]*qbtypes.KeyEvolutionMetadataKey),
	}
}

func (m *mockKeyEvolutionMetadataStore) Get(keyName string) []*qbtypes.KeyEvolutionMetadataKey {
	if m.metadata == nil {
		return nil
	}
	keys, exists := m.metadata[keyName]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	result := make([]*qbtypes.KeyEvolutionMetadataKey, len(keys))
	copy(result, keys)
	return result
}

func (m *mockKeyEvolutionMetadataStore) Add(keyName string, key *qbtypes.KeyEvolutionMetadataKey) {
	if m.metadata == nil {
		m.metadata = make(map[string][]*qbtypes.KeyEvolutionMetadataKey)
	}
	m.metadata[keyName] = append(m.metadata[keyName], key)
}

func TestGetColumn(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		expectedCol   *schema.Column
		expectedError error
	}{
		{
			name: "Resource field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedCol:   logsV2Columns["resource"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope.name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_name"],
			expectedError: nil,
		},
		{
			name: "Scope field - version",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "version",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_version"],
			expectedError: nil,
		},
		{
			name: "Scope field - other scope field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   logsV2Columns["scope_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - string type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedCol:   logsV2Columns["attributes_string"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			expectedCol:   logsV2Columns["attributes_number"],
			expectedError: nil,
		},
		{
			name: "Attribute field - bool type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   logsV2Columns["attributes_bool"],
			expectedError: nil,
		},
		{
			name: "Log field - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   logsV2Columns["timestamp"],
			expectedError: nil,
		},
		{
			name: "Log field - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   logsV2Columns["body"],
			expectedError: nil,
		},
		{
			name: "Log field - nonexistent",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "did_user_login",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "did_user_login",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   logsV2Columns["attributes_bool"],
			expectedError: nil,
		},
	}

	mockStore := newMockKeyEvolutionMetadataStore()
	fm := NewFieldMapper(mockStore)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(ctx, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedCol, col)
			}
		})
	}
}

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		// {
		// 	name: "Simple column type - timestamp",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:         "timestamp",
		// 		FieldContext: telemetrytypes.FieldContextLog,
		// 	},
		// 	expectedResult: "timestamp",
		// 	expectedError:  nil,
		// },
		// {
		// 	name: "Map column type - string attribute",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:          "user.id",
		// 		FieldContext:  telemetrytypes.FieldContextAttribute,
		// 		FieldDataType: telemetrytypes.FieldDataTypeString,
		// 	},
		// 	expectedResult: "attributes_string['user.id']",
		// 	expectedError:  nil,
		// },
		// {
		// 	name: "Map column type - number attribute",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:          "request.size",
		// 		FieldContext:  telemetrytypes.FieldContextAttribute,
		// 		FieldDataType: telemetrytypes.FieldDataTypeNumber,
		// 	},
		// 	expectedResult: "attributes_number['request.size']",
		// 	expectedError:  nil,
		// },
		// {
		// 	name: "Map column type - bool attribute",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:          "request.success",
		// 		FieldContext:  telemetrytypes.FieldContextAttribute,
		// 		FieldDataType: telemetrytypes.FieldDataTypeBool,
		// 	},
		// 	expectedResult: "attributes_bool['request.success']",
		// 	expectedError:  nil,
		// },
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		// {
		// 	name: "Map column type - resource attribute - Materialized",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:          "service.name",
		// 		FieldContext:  telemetrytypes.FieldContextResource,
		// 		FieldDataType: telemetrytypes.FieldDataTypeString,
		// 		Materialized:  true,
		// 	},
		// 	expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, `resource_string_service$$name_exists`==true, `resource_string_service$$name`, NULL)",
		// 	expectedError:  nil,
		// },
		// {
		// 	name:    "Map column type - resource attribute - json",
		// 	tsStart: uint64(time.Now().Add(10 * time.Second).UnixNano()),
		// 	tsEnd:   uint64(time.Now().Add(20 * time.Second).UnixNano()),
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:         "service.name",
		// 		FieldContext: telemetrytypes.FieldContextResource,
		// 	},
		// 	expectedResult: "resource.`service.name`::String",
		// 	expectedError:  nil,
		// },
		// {
		// 	name:    "Map column type - resource attribute - Materialized - json",
		// 	tsStart: uint64(time.Now().Add(10 * time.Second).UnixNano()),
		// 	tsEnd:   uint64(time.Now().Add(20 * time.Second).UnixNano()),
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:          "service.name",
		// 		FieldContext:  telemetrytypes.FieldContextResource,
		// 		FieldDataType: telemetrytypes.FieldDataTypeString,
		// 		Materialized:  true,
		// 	},
		// 	expectedResult: "resource.`service.name`::String",
		// 	expectedError:  nil,
		// },
		// {
		// 	name: "Non-existent column",
		// 	key: telemetrytypes.TelemetryFieldKey{
		// 		Name:         "nonexistent_field",
		// 		FieldContext: telemetrytypes.FieldContextLog,
		// 	},
		// 	expectedResult: "",
		// 	expectedError:  qbtypes.ErrColumnNotFound,
		// },
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockStore := newMockKeyEvolutionMetadataStore()
			fm := NewFieldMapper(mockStore)
			result, err := fm.FieldFor(ctx, tc.tsStart, tc.tsEnd, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestFieldForWithEvolutionMetadata(t *testing.T) {
	ctx := context.Background()

	// Create a test release time
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	testCases := []struct {
		name           string
		tsStart        uint64
		tsEnd          uint64
		key            telemetrytypes.TelemetryFieldKey
		setupMock      func(*mockKeyEvolutionMetadataStore)
		expectedResult string
		expectedError  error
	}{
		{
			name:    "Resource attribute - tsStart before release time (use new JSON column only)",
			tsStart: releaseTimeNano - uint64(24*time.Hour.Nanoseconds()), // 1 day before release
			tsEnd:   releaseTimeNano + uint64(24*time.Hour.Nanoseconds()),
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			setupMock: func(m *mockKeyEvolutionMetadataStore) {
				m.Add("resources_string", &qbtypes.KeyEvolutionMetadataKey{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    releaseTime,
				})
			},
			expectedResult: "resource.`service.name`::String",
			expectedError:  nil,
		},
		{
			name:    "Resource attribute - tsStart after release time (use fallback with multiIf)",
			tsStart: releaseTimeNano + uint64(24*time.Hour.Nanoseconds()), // 1 day after release
			tsEnd:   releaseTimeNano + uint64(48*time.Hour.Nanoseconds()),
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			setupMock: func(m *mockKeyEvolutionMetadataStore) {
				m.Add("resources_string", &qbtypes.KeyEvolutionMetadataKey{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    releaseTime,
				})
			},
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		{
			name:    "Resource attribute - no evolution metadata (use fallback with multiIf)",
			tsStart: releaseTimeNano,
			tsEnd:   releaseTimeNano + uint64(24*time.Hour.Nanoseconds()),
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			setupMock: func(m *mockKeyEvolutionMetadataStore) {
				// No metadata added - empty mock
			},
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		{
			name:    "Resource attribute - tsStart exactly at release time (use fallback with multiIf)",
			tsStart: releaseTimeNano,
			tsEnd:   releaseTimeNano + uint64(24*time.Hour.Nanoseconds()),
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			setupMock: func(m *mockKeyEvolutionMetadataStore) {
				m.Add("resources_string", &qbtypes.KeyEvolutionMetadataKey{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    releaseTime,
				})
			},
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockStore := newMockKeyEvolutionMetadataStore()
			if tc.setupMock != nil {
				tc.setupMock(mockStore)
			}
			fm := NewFieldMapper(mockStore)
			result, err := fm.FieldFor(ctx, tc.tsStart, tc.tsEnd, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}
