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
			expectedCol:   []*schema.Column{logsV2Columns["resources_string"], logsV2Columns["resource"]},
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

	fm := NewFieldMapper()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(ctx, 0, 0, &tc.key)

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
			fm := NewFieldMapper()
			result, err := fm.FieldFor(ctx, 0, 0, &tc.key)

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
		// 			ColumnName:   LogsV2BodyJSONColumn,
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
			fm := NewFieldMapper()

			tsStart := uint64(tc.tsStartTime.UnixNano())
			tsEnd := uint64(tc.tsEndTime.UnixNano())
			tc.key.Evolutions = tc.evolutions

			result, err := fm.FieldFor(ctx, tsStart, tsEnd, tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestSelectEvolutionsForColumns(t *testing.T) {
	testCases := []struct {
		name            string
		columns         []*schema.Column
		evolutions      []*telemetrytypes.EvolutionEntry
		tsStart         uint64
		tsEnd           uint64
		expectedColumns []string // column names
		expectedEvols   []string // evolution column names
		expectedError   bool
		errorStr        string
	}{
		{
			name: "New evolutions after tsStartTime - should include all",
			columns: []*schema.Column{
				logsV2Columns["resources_string"],
				logsV2Columns["resource"],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resource", "resources_string"}, // sorted by ReleaseTime desc
			expectedEvols:   []string{"resource", "resources_string"},
		},
		{
			name: "Columns without matching evolutions - should exclude them",
			columns: []*schema.Column{
				logsV2Columns["resources_string"],
				logsV2Columns["resource"],          // no evolution for this
				logsV2Columns["attributes_string"], // no evolution for this
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"},
			expectedEvols:   []string{"resources_string"},
		},
		{
			name: "New evolutions after tsEndTime - should exclude all",
			columns: []*schema.Column{
				logsV2Columns["resources_string"],
				logsV2Columns["resource"],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 25, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"},
			expectedEvols:   []string{"resources_string"},
		},
		{
			name:    "Empty columns array",
			columns: []*schema.Column{},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{},
			expectedEvols:   []string{},
			expectedError:   true,
			errorStr:        "column resources_string not found",
		},
		{
			name: "Duplicate evolutions - should use first encountered (oldest if sorted)",
			columns: []*schema.Column{
				logsV2Columns["resource"],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resource"},
			expectedEvols:   []string{"resource"}, // should use first one (older)
		},
		{
			name: "Genuine Duplicate evolutions with new version- should consider both",
			columns: []*schema.Column{
				logsV2Columns["resources_string"],
				logsV2Columns["resource"],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      2,
					ReleaseTime:  time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 1, 16, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string", "resource"},
			expectedEvols:   []string{"resources_string", "resource"}, // should use first one (older)
		},
		{
			name: "Evolution exactly at tsEndTime",
			columns: []*schema.Column{
				logsV2Columns["resources_string"],
				logsV2Columns["resource"],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC), // exactly at tsEnd
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"}, // resource excluded because After(tsEnd) is true
			expectedEvols:   []string{"resources_string"},
		},
		{
			name: "Single evolution after tsStartTime - JSON body",
			columns: []*schema.Column{
				logsV2Columns[LogsV2BodyJSONColumn],
				logsV2Columns[LogsV2BodyPromotedColumn],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyJSONColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyPromotedColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "user.name",
					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{LogsV2BodyPromotedColumn, LogsV2BodyJSONColumn}, // sorted by ReleaseTime desc (newest first)
			expectedEvols:   []string{LogsV2BodyPromotedColumn, LogsV2BodyJSONColumn},
		},
		{
			name: "No evolution after tsStartTime - JSON body",
			columns: []*schema.Column{
				logsV2Columns[LogsV2BodyJSONColumn],
				logsV2Columns[LogsV2BodyPromotedColumn],
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyJSONColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyPromotedColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "user.name",
					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{LogsV2BodyPromotedColumn},
			expectedEvols:   []string{LogsV2BodyPromotedColumn},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resultColumns, resultEvols, err := selectEvolutionsForColumns(tc.columns, tc.evolutions, tc.tsStart, tc.tsEnd)

			if tc.expectedError {
				assert.Contains(t, err.Error(), tc.errorStr)
			} else {
				require.NoError(t, err)
				assert.Equal(t, len(tc.expectedColumns), len(resultColumns), "column count mismatch")
				assert.Equal(t, len(tc.expectedEvols), len(resultEvols), "evolution count mismatch")

				resultColumnNames := make([]string, len(resultColumns))
				for i, col := range resultColumns {
					resultColumnNames[i] = col.Name
				}
				resultEvolNames := make([]string, len(resultEvols))
				for i, evol := range resultEvols {
					resultEvolNames[i] = evol.ColumnName
				}

				for i := range tc.expectedColumns {
					assert.Equal(t, resultColumnNames[i], tc.expectedColumns[i], "expected column missing: "+tc.expectedColumns[i])
				}
				for i := range tc.expectedEvols {
					assert.Equal(t, resultEvolNames[i], tc.expectedEvols[i], "expected evolution missing: "+tc.expectedEvols[i])
				}
				// Verify sorting: should be descending by ReleaseTime
				for i := 0; i < len(resultEvols)-1; i++ {
					assert.True(t, !resultEvols[i].ReleaseTime.Before(resultEvols[i+1].ReleaseTime),
						"evolutions should be sorted descending by ReleaseTime")
				}
			}
		})
	}
}
