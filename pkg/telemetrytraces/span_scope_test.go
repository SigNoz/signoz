package telemetrytraces

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
)

func TestSpanScopeConditions(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	sb := sqlbuilder.NewSelectBuilder()
	ctx := context.Background()

	tests := []struct {
		name          string
		key           *telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedError bool
	}{
		{
			name: "isroot = true",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       true,
			expectedSQL: "parent_span_id = ''",
		},
		{
			name: "isroot = 'true' (string)",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       "true",
			expectedSQL: "parent_span_id = ''",
		},
		{
			name: "isroot = 'TRUE' (uppercase)",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isRoot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       "TRUE",
			expectedSQL: "parent_span_id = ''",
		},
		{
			name: "isentrypoint = true",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isentrypoint",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       true,
			expectedSQL: "((name, resource_string_service$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from signoz_traces.distributed_top_level_operations)) AND parent_span_id != ''",
		},
		{
			name: "isEntryPoint = true (mixed case)",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isEntryPoint",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       true,
			expectedSQL: "((name, resource_string_service$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from signoz_traces.distributed_top_level_operations)) AND parent_span_id != ''",
		},
		{
			name: "isroot with wrong operator",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         true,
			expectedError: true,
		},
		{
			name: "isroot = false",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         false,
			expectedError: true,
		},
		{
			name: "isroot with non-boolean value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         123,
			expectedError: true,
		},
		{
			name: "regular span field",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:    qbtypes.FilterOperatorEqual,
			value:       "test-span",
			expectedSQL: "$1", // sqlbuilder uses placeholder syntax
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			condition, err := cb.ConditionFor(ctx, tt.key, tt.operator, tt.value, sb)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedSQL, condition)
			}
		})
	}
}

func TestSpanScopeFieldMapper(t *testing.T) {
	fm := NewFieldMapper()
	ctx := context.Background()

	tests := []struct {
		name        string
		key         *telemetrytypes.TelemetryFieldKey
		expectField string
		expectError bool
	}{
		{
			name: "isroot field",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isroot",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			expectField: "isroot",
		},
		{
			name: "isentrypoint field",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "isentrypoint",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			expectField: "isentrypoint",
		},
		{
			name: "regular span field",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			expectField: "name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field, err := fm.FieldFor(ctx, tt.key)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectField, field)
			}
		})
	}
}
