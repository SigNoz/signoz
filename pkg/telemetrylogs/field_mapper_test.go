package telemetrylogs

import (
	"context"
	"testing"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetColumn(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		expectedCol   []*schema.Column
		expectedError error
	}{
		{
			name: "Resource field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedCol:   []*schema.Column{logsV2Columns["resource"], logsV2Columns["resources_string"]},
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   []*schema.Column{logsV2Columns["scope_name"]},
			expectedError: nil,
		},
		{
			name: "Scope field - scope.name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   []*schema.Column{logsV2Columns["scope_name"]},
			expectedError: nil,
		},
		{
			name: "Scope field - scope_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   []*schema.Column{logsV2Columns["scope_name"]},
			expectedError: nil,
		},
		{
			name: "Scope field - version",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "version",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   []*schema.Column{logsV2Columns["scope_version"]},
			expectedError: nil,
		},
		{
			name: "Scope field - other scope field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   []*schema.Column{logsV2Columns["scope_string"]},
			expectedError: nil,
		},
		{
			name: "Attribute field - string type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedCol:   []*schema.Column{logsV2Columns["attributes_string"]},
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedCol:   []*schema.Column{logsV2Columns["attributes_number"]},
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			expectedCol:   []*schema.Column{logsV2Columns["attributes_number"]},
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			expectedCol:   []*schema.Column{logsV2Columns["attributes_number"]},
			expectedError: nil,
		},
		{
			name: "Attribute field - bool type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   []*schema.Column{logsV2Columns["attributes_bool"]},
			expectedError: nil,
		},
		{
			name: "Log field - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   []*schema.Column{logsV2Columns["timestamp"]},
			expectedError: nil,
		},
		{
			name: "Log field - body",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "body",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   []*schema.Column{logsV2Columns["body"]},
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
			expectedCol:   []*schema.Column{logsV2Columns["attributes_bool"]},
			expectedError: nil,
		},
	}

	fl := flaggertest.New(t)
	fm := NewFieldMapper(fl)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(ctx, valuer.UUID{}, 0, 0, &tc.key)

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

	resourceEvolution := mockEvolutionData(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC))

	testCases := []struct {
		name            string
		key             telemetrytypes.TelemetryFieldKey
		expectedResult  string
		expectedError   error
		addExistsFilter bool
	}{
		{
			name: "Simple column type - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedResult:  "timestamp",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Map column type - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult:  "attributes_string['user.id']",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Map column type - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult:  "attributes_number['request.size']",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Map column type - bool attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult:  "attributes_bool['request.success']",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Evolutions:   resourceEvolution,
			},
			expectedResult:  "resources_string['service.name']",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Map column type - resource attribute - Materialized - json",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
				Evolutions:    resourceEvolution,
			},
			expectedResult:  "`resource_string_service$$name`",
			expectedError:   nil,
			addExistsFilter: false,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedResult: "",
			expectedError:  qbtypes.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fl := flaggertest.New(t)
			fm := NewFieldMapper(fl)
			result, err := fm.FieldFor(ctx, valuer.UUID{}, 0, 0, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestFieldForWithEvolutions(t *testing.T) {
	ctx := context.Background()

	key := &telemetrytypes.TelemetryFieldKey{
		Name:         "service.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}

	testCases := []struct {
		name           string
		evolutions     []*telemetrytypes.EvolutionEntry
		key            *telemetrytypes.TelemetryFieldKey
		tsStartTime    time.Time
		tsEndTime      time.Time
		expectedResult string
		expectedError  error
	}{
		{
			name: "Single evolution before tsStartTime",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "resources_string['service.name']",
			expectedError:  nil,
		},
		{
			name: "Single evolution exactly at tsStartTime",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "resources_string['service.name']",
			expectedError:  nil,
		},
		{
			name: "Single evolution after tsStartTime",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		// TODO(piyush): to be added once integration with JSON is done.
		// {
		// 	name: "Single evolution after tsStartTime - JSON body",
		// 	evolutions: []*telemetrytypes.EvolutionEntry{
		// 		{
		// 			Signal:       telemetrytypes.SignalLogs,
		// 			ColumnName:   LogsV2BodyV2Column,
		// 			ColumnType:   "JSON(max_dynamic_paths=0)",
		// 			FieldContext: telemetrytypes.FieldContextBody,
		// 			FieldName:    "__all__",
		// 			ReleaseTime:  time.Unix(0, 0),
		// 		},
		// 		{
		// 			Signal:       telemetrytypes.SignalLogs,
		// 			ColumnName:   LogsV2BodyPromotedColumn,
		// 			ColumnType:   "JSON()",
		// 			FieldContext: telemetrytypes.FieldContextBody,
		// 			FieldName:    "user.name",
		// 			ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
		// 		},
		// 	},
		// 	key: &telemetrytypes.TelemetryFieldKey{
		// 		Name:         "user.name",
		// 		FieldContext: telemetrytypes.FieldContextBody,
		// 		JSONDataType: &telemetrytypes.String,
		// 		Materialized: true,
		// 	},
		// 	tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
		// 	tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
		// 	expectedResult: "coalesce(dynamicElement(body_json.`user.name`, 'String'), dynamicElement(body_promoted.`user.name`, 'String'))",
		// 	expectedError:  nil,
		// },
		{
			name: "Multiple evolutions before tsStartTime - only latest should be included",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "resource.`service.name`::String",
			expectedError:  nil,
		},
		{
			name: "Multiple evolutions after tsStartTime - all should be included",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Unix(0, 0),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		{
			name: "Duplicate evolutions after tsStartTime - all should be included",
			// Note: on production when this happens, we should go ahead and clean it up if required
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "resource.`service.name`::String",
			expectedError:  nil,
		},
		{
			name: "Evolution exactly at tsEndTime - should not be included",
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "resources_string['service.name']",
			expectedError:  nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fl := flaggertest.New(t)
			fm := NewFieldMapper(fl)

			tsStart := uint64(tc.tsStartTime.UnixNano())
			tsEnd := uint64(tc.tsEndTime.UnixNano())
			tc.key.Evolutions = tc.evolutions

			result, err := fm.FieldFor(ctx, valuer.UUID{}, tsStart, tsEnd, tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestFieldForWithMaterialized(t *testing.T) {
	ctx := context.Background()

	materializedKey := &telemetrytypes.TelemetryFieldKey{
		Name:          "service.name",
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
		Evolutions: []*telemetrytypes.EvolutionEntry{
			{
				Signal:       telemetrytypes.SignalLogs,
				ColumnName:   "resources_string",
				ColumnType:   "Map(LowCardinality(String), String)",
				FieldContext: telemetrytypes.FieldContextResource,
				FieldName:    "__all__",
				ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			},
			{
				Signal:       telemetrytypes.SignalLogs,
				ColumnName:   "resource",
				ColumnType:   "JSON()",
				FieldContext: telemetrytypes.FieldContextResource,
				FieldName:    "__all__",
				ReleaseTime:  time.Date(2024, 3, 2, 0, 0, 0, 0, time.UTC),
			},
		},
	}

	tests := []struct {
		name           string
		start, end     time.Time
		expectedResult string
	}{
		{
			name:           "Map column in use (pre-evolution to JSON)",
			start:          time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			end:            time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
			expectedResult: "`resource_string_service$$name`",
		},
		{
			name:           "Multi evolution - both columns (JSON + materialized)",
			start:          time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			end:            time.Date(2024, 4, 2, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, `resource_string_service$$name_exists`, `resource_string_service$$name`, NULL)",
		},
	}

	fl := flaggertest.New(t)
	fm := NewFieldMapper(fl)

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			start := uint64(tc.start.UnixNano())
			end := uint64(tc.end.UnixNano())
			result, err := fm.FieldFor(ctx, valuer.UUID{}, start, end, materializedKey)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
