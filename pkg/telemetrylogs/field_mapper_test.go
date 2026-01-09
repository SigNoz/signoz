package telemetrylogs

import (
	"context"
	"testing"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
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

	fm := NewFieldMapper(nil)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(ctx, valuer.GenerateUUID(), 0, 0, &tc.key)

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
	orgId := valuer.GenerateUUID()
	ctx = authtypes.NewContextWithClaims(ctx, authtypes.Claims{
		OrgID: orgId.String(),
	})

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
			mockStore := telemetrytypestest.NewMockMetadataStore()
			mockStore.ColumnEvolutionMetadataMap = mockKeyEvolutionMetadata(orgId, telemetrytypes.SignalLogs.StringValue(), telemetrytypes.FieldContextResource.StringValue(), time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC))
			fm := NewFieldMapper(mockStore)
			result, err := fm.FieldFor(ctx, orgId, 0, 0, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

// func TestBuildEvolutionMultiIfExpression(t *testing.T) {
// 	key := &telemetrytypes.TelemetryFieldKey{
// 		Name:         "service.name",
// 		FieldContext: telemetrytypes.FieldContextResource,
// 	}

// 	testCases := []struct {
// 		name           string
// 		evolutions     []*telemetrytypes.EvolutionEntry
// 		key            *telemetrytypes.TelemetryFieldKey
// 		tsStartTime    time.Time
// 		tsEndTime      time.Time
// 		expectedResult string
// 	}{
// 		{
// 			name:           "No evolution",
// 			evolutions:     []*telemetrytypes.EvolutionEntry{},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(, NULL)",
// 		},
// 		{
// 			name:       "No evolution - JSON body",
// 			evolutions: []*telemetrytypes.EvolutionEntry{},
// 			key: &telemetrytypes.TelemetryFieldKey{
// 				Name:         "user.name",
// 				FieldContext: telemetrytypes.FieldContextBody,
// 			},
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(, NULL)",
// 		},
// 		{
// 			name: "Single evolution before tsStartTime",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "resources_string['service.name']",
// 		},
// 		{
// 			name: "Single evolution exactly at tsStartTime",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "attributes_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "attributes_string['service.name']",
// 		},
// 		{
// 			name: "Single evolution exactly at tsStartTime - JSON body",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "body_json",
// 					ColumnType:   "JSON(max_dynamic_paths=0)",
// 					FieldContext: telemetrytypes.FieldContextBody,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key: &telemetrytypes.TelemetryFieldKey{
// 				Name:         "user.name",
// 				FieldContext: telemetrytypes.FieldContextBody,
// 			},
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "body_json.`user.name`::String",
// 		},
// 		{
// 			name: "Single evolution after tsStartTime",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
// 		},
// 		{
// 			name: "Single evolution after tsStartTime - JSON body",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "body_json",
// 					ColumnType:   "JSON(max_dynamic_paths=0)",
// 					FieldContext: telemetrytypes.FieldContextBody,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "body_promoted",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextBody,
// 					FieldName:    "user.name",
// 					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key: &telemetrytypes.TelemetryFieldKey{
// 				Name:         "user.name",
// 				FieldContext: telemetrytypes.FieldContextBody,
// 			},
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(body_promoted.`user.name` IS NOT NULL, body_promoted.`user.name`::String, body_json.`user.name` IS NOT NULL, body_json.`user.name`::String, NULL)",
// 		},
// 		{
// 			name: "Multiple evolutions before tsStartTime - only latest should be included",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "resource.`service.name`::String",
// 		},
// 		{
// 			name: "Multiple evolutions after tsStartTime - all should be included",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
// 		},
// 		{
// 			name: "Duplicate evolutions after tsStartTime - all should be included",
// 			// Note: on production when this happens, we should go ahead and clean it up if required
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, resource.`service.name` IS NOT NULL, resource.`service.name`::String, NULL)",
// 		},
// 		{
// 			name: "Many evolutions after tsStartTime",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource_v2",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(resource_v2.`service.name` IS NOT NULL, resource_v2.`service.name`::String, resource.`service.name` IS NOT NULL, resource.`service.name`::String, NULL)",
// 		},
// 		{
// 			name: "Evolution exactly at tsEndTime - should not be included",
// 			evolutions: []*telemetrytypes.EvolutionEntry{
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resources_string",
// 					ColumnType:   "Map(LowCardinality(String), String)",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
// 				},
// 				{
// 					Signal:       telemetrytypes.SignalLogs,
// 					ColumnName:   "resource",
// 					ColumnType:   "JSON()",
// 					FieldContext: telemetrytypes.FieldContextResource,
// 					FieldName:    "__all__",
// 					ReleaseTime:  time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 				},
// 			},
// 			key:            key,
// 			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
// 			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
// 			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
// 		},
// 	}

// 	for _, tc := range testCases {
// 		t.Run(tc.name, func(t *testing.T) {
// 			result := buildEvolutionMultiIfExpression(tc.evolutions, tc.key, tc.tsStartTime, tc.tsEndTime)
// 			assert.Equal(t, tc.expectedResult, result)
// 		})
// 	}
// }
