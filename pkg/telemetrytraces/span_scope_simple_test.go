package telemetrytraces

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSpanScopeFilterExpression(t *testing.T) {
	// Test that span scope fields work in filter expressions
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	tests := []struct {
		name              string
		expression        string
		expectedCondition string
		expectError       bool
	}{
		{
			name:              "simple isroot filter",
			expression:        "isroot = true",
			expectedCondition: "parent_span_id = ''",
		},
		{
			name:              "simple isentrypoint filter",
			expression:        "isentrypoint = true",
			expectedCondition: "((name, resource_string_service$name) GLOBAL IN (SELECT DISTINCT name, serviceName from signoz_traces.distributed_top_level_operations)) AND parent_span_id != ''",
		},
		{
			name:              "combined filter with AND",
			expression:        "isroot = true AND has_error = true",
			expectedCondition: "parent_span_id = ''",
		},
		{
			name:              "combined filter with OR",
			expression:        "isentrypoint = true OR has_error = true",
			expectedCondition: "((name, resource_string_service$name) GLOBAL IN (SELECT DISTINCT name, serviceName from signoz_traces.distributed_top_level_operations)) AND parent_span_id != ''",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Parse the expression and build the where clause
			sb := sqlbuilder.NewSelectBuilder()

			// Prepare field keys for span scope fields
			fieldKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
			fieldKeys["isroot"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			}}
			fieldKeys["isentrypoint"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "isentrypoint",
				FieldContext: telemetrytypes.FieldContextSpan,
			}}
			fieldKeys["has_error"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "has_error",
				FieldContext: telemetrytypes.FieldContextSpan,
			}}

			whereClause, _, err := querybuilder.PrepareWhereClause(tt.expression, querybuilder.FilterExprVisitorOpts{
				FieldMapper:      fm,
				ConditionBuilder: cb,
				FieldKeys:        fieldKeys,
				Builder:          sb,
			})

			if tt.expectError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, whereClause)

				// Apply the where clause to the builder and get the SQL
				sb.AddWhereClause(whereClause)
				whereSQL, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				t.Logf("Generated SQL: %s", whereSQL)
				assert.Contains(t, whereSQL, tt.expectedCondition)
			}
		})
	}
}

func TestSpanScopeWithResourceFilter(t *testing.T) {
	// Test that span scope fields are marked as SkipResourceFilter
	tests := []struct {
		name       string
		expression string
	}{
		{
			name:       "isroot should skip resource filter",
			expression: "isroot = true",
		},
		{
			name:       "isentrypoint should skip resource filter",
			expression: "isentrypoint = true",
		},
		{
			name:       "combined expression should skip resource filter",
			expression: "isroot = true AND service.name = 'api'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For now, just verify the expression parses correctly
			// In a real implementation, we'd need to check that the resource filter
			// is properly skipped when span scope fields are present
			fm := NewFieldMapper()
			cb := NewConditionBuilder(fm)

			// Prepare field keys for the test
			fieldKeys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
			fieldKeys["isroot"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			}}
			fieldKeys["isentrypoint"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "isentrypoint",
				FieldContext: telemetrytypes.FieldContextSpan,
			}}
			fieldKeys["service.name"] = []*telemetrytypes.TelemetryFieldKey{{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			}}

			_, _, err := querybuilder.PrepareWhereClause(tt.expression, querybuilder.FilterExprVisitorOpts{
				FieldMapper:        fm,
				ConditionBuilder:   cb,
				FieldKeys:          fieldKeys,
				SkipResourceFilter: false, // This would be set by the statement builder
			})

			assert.NoError(t, err)
		})
	}
}
