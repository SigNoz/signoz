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

	mockStore := telemetrytypestest.NewMockKeyEvolutionMetadataStore(nil)
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
			expectedResult:  "multiIf(mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
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
			expectedResult:  "multiIf(`resource_string_service$$name_exists`==true, `resource_string_service$$name`, NULL)",
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
			mockStore := telemetrytypestest.NewMockKeyEvolutionMetadataStore(nil)
			fm := NewFieldMapper(mockStore)
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

func TestBuildEvolutionMultiIfExpression(t *testing.T) {
	baseColumnExpr := "mapContains(resources_string, 'service.name'), resources_string['service.name']"
	key := &telemetrytypes.TelemetryFieldKey{
		Name:         "service.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}

	testCases := []struct {
		name           string
		evolutions     []*telemetrytypes.KeyEvolutionMetadataKey
		key            *telemetrytypes.TelemetryFieldKey
		baseColumnExpr string
		tsStartTime    time.Time
		tsEndTime      time.Time
		expectedResult string
	}{
		{
			name:           "No evolution",
			evolutions:     []*telemetrytypes.KeyEvolutionMetadataKey{},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},
		{
			name: "Single evolution before tsStartTime",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource.`service.name`::String IS NOT NULL, resource.`service.name`::String, NULL)",
		},
		{
			name: "Single evolution exactly at tsStartTime",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "attributes_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "attributes",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(attributes.`service.name`::String IS NOT NULL, attributes.`service.name`::String, NULL)",
		},
		{
			name: "Single evolution exactly at tsStartTime - JSON body",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "body_v2.user.name",
					BaseColumnType: "JSON_PATH",
					NewColumn:      "body_promoted.user.name",
					NewColumnType:  "JSON_PATH",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "body_v2.user.name",
				FieldContext: telemetrytypes.FieldContextBody,
			},
			baseColumnExpr: "body_v2.`user.name` IS NOT NULL, body_v2.`user.name`",
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(body_promoted.user.name IS NOT NULL, body_promoted.user.name, NULL)",
		},
		{
			name: "Single evolution after tsStartTime",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource.`service.name`::String IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},
		{
			name: "Single evolution after tsStartTime - JSON body",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "body_v2.user.name",
					BaseColumnType: "JSON_PATH",
					NewColumn:      "body_promoted.user.name",
					NewColumnType:  "JSON_PATH",
					ReleaseTime:    time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "body_v2.user.name",
				FieldContext: telemetrytypes.FieldContextBody,
			},
			baseColumnExpr: "body_v2.`user.name` IS NOT NULL, body_v2.`user.name`",
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(body_promoted.user.name IS NOT NULL, body_promoted.user.name, body_v2.`user.name` IS NOT NULL, body_v2.`user.name`, NULL)",
		},
		{
			name: "Single evolution after tsEndTime - newest evolution should be included",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},
		{
			name: "Single evolution after tsEndTime - newest evolution should be included - materialized",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Materialized: true,
			},
			baseColumnExpr: "`resource_string_service$$name_exists`==true, `resource_string_service$$name`",
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(`resource_string_service$$name_exists`==true, `resource_string_service$$name`, NULL)",
		},
		{
			name: "Multiple evolutions before tsStartTime - only latest should be included",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v1",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v2",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource_v2.`service.name`::String IS NOT NULL, resource_v2.`service.name`::String, NULL)",
		},
		{
			name: "Multiple evolutions after tsStartTime - all should be included",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v1",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).Add(24 * time.Hour),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v2",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).Add(48 * time.Hour),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource_v2.`service.name`::String IS NOT NULL, resource_v2.`service.name`::String, resource_v1.`service.name`::String IS NOT NULL, resource_v1.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},
		{
			name: "Mix of evolutions before and after tsStartTime",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v1",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v2",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v3",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).Add(24 * time.Hour),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v4",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).Add(48 * time.Hour),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource_v4.`service.name`::String IS NOT NULL, resource_v4.`service.name`::String, resource_v3.`service.name`::String IS NOT NULL, resource_v3.`service.name`::String, resource_v2.`service.name`::String IS NOT NULL, resource_v2.`service.name`::String, NULL)",
		},
		{
			name: "Evolution exactly at tsEndTime - should not be included",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},

		{
			name: "Evolution at tsStartTime and after tsStartTime",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v1",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
				{
					BaseColumn:     "resources_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "resource_v2",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).Add(24 * time.Hour),
				},
			},
			key:            key,
			baseColumnExpr: baseColumnExpr,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(resource_v2.`service.name`::String IS NOT NULL, resource_v2.`service.name`::String, resource_v1.`service.name`::String IS NOT NULL, resource_v1.`service.name`::String, NULL)",
		},
		{
			name: "Evolution before tsStartTime and at tsStartTime - latest before should be included",
			evolutions: []*telemetrytypes.KeyEvolutionMetadataKey{
				{
					BaseColumn:     "attributes_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "attributes",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					BaseColumn:     "attributes_string",
					BaseColumnType: "Map(LowCardinality(String), String)",
					NewColumn:      "attributes_v2",
					NewColumnType:  "JSON(max_dynamic_paths=100)",
					ReleaseTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			key:            key,
			tsStartTime:    time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
			tsEndTime:      time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			expectedResult: "multiIf(attributes_v2.`service.name`::String IS NOT NULL, attributes_v2.`service.name`::String, NULL)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := buildEvolutionMultiIfExpression(tc.evolutions, tc.key, tc.tsStartTime, tc.tsEndTime, tc.baseColumnExpr)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
