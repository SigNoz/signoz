package telemetrymetadata

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConditionFor(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder(NewFieldMapper())

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedArgs  []any
		expectedError error
	}{

		{
			name: "ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), LOWER(attributes['user.id']) LIKE LOWER(?), false)",
			expectedError: nil,
		},
		{
			name: "Not ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotILike,
			value:         "%admin%",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), LOWER(attributes['user.id']) NOT LIKE LOWER(?), true)",
			expectedError: nil,
		},
		{
			name: "Equal operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "admin",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), attributes['user.id'] = ?, false)",
			expectedError: nil,
		},
		{
			name: "Not Equal operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         "admin",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), attributes['user.id'] <> ?, true)",
			expectedError: nil,
		},
		{
			name: "In operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"admin", "root"},
			expectedSQL:   "WHERE if(mapContains(attributes, ?), (attributes['user.id'] = ? OR attributes['user.id'] = ?), false)",
			expectedError: nil,
		},
		{
			name: "Not In operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"admin", "root"},
			expectedSQL:   "WHERE if(mapContains(attributes, ?), (attributes['user.id'] <> ? AND attributes['user.id'] <> ?), true)",
			expectedError: nil,
		},
		{
			name: "Like operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         "%admin%",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), attributes['user.id'] LIKE ?, false)",
			expectedError: nil,
		},
		{
			name: "Not Like operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotLike,
			value:         "%admin%",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), attributes['user.id'] NOT LIKE ?, true)",
			expectedError: nil,
		},
		{
			name: "Contains operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "admin",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), LOWER(attributes['user.id']) LIKE LOWER(?), false)",
			expectedError: nil,
		},
		{
			name: "Not Contains operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotContains,
			value:         "admin",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), LOWER(attributes['user.id']) NOT LIKE LOWER(?), true)",
			expectedError: nil,
		},
		{
			name: "Regexp operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorRegexp,
			value:         "adm.*",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), match(attributes['user.id'], ?), false)",
			expectedError: nil,
		},
		{
			name: "Not Regexp operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotRegexp,
			value:         "adm.*",
			expectedSQL:   "WHERE if(mapContains(attributes, ?), NOT match(attributes['user.id'], ?), true)",
			expectedError: nil,
		},
		{
			name: "Equal operator - span field in the intrinsic map",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "http_method",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "GET",
			expectedSQL:   "WHERE if(mapContains(intrinsic_attributes, ?), intrinsic_attributes['http_method'] = ?, false)",
			expectedError: nil,
		},
		{
			name: "Equal operator - bool span field compares the string form",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "has_error",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         true,
			expectedSQL:   "WHERE if(mapContains(intrinsic_attributes, ?), intrinsic_attributes['has_error'] = ?, false)",
			expectedArgs:  []any{"has_error", "true"},
			expectedError: nil,
		},
		{
			name: "Equal operator - numeric span field builds no condition",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         1000,
			expectedSQL:   "",
			expectedError: nil,
		},
		{
			name: "Equal operator - log severity in the intrinsic map",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "severity_text",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "ERROR",
			expectedSQL:   "WHERE if(mapContains(intrinsic_attributes, ?), intrinsic_attributes['severity_text'] = ?, false)",
			expectedError: nil,
		},
		{
			name: "Exists operator - positive fallback false",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "WHERE if(mapContains(attributes, ?), mapContains(attributes, 'user.id') = ?, false)",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - negative fallback true",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "WHERE if(mapContains(attributes, ?), mapContains(attributes, 'user.id') <> ?, true)",
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, _, err := conditionBuilder.ConditionFor(ctx, valuer.UUID{}, 0, 0, &tc.key, map[string][]*telemetrytypes.TelemetryFieldKey{tc.key.Name: {&tc.key}}, qbtypes.ConditionBuilderOptions{}, tc.operator, tc.value, sb)
			sb.Where(cond...)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expectedSQL)
				if tc.expectedArgs != nil {
					assert.Equal(t, tc.expectedArgs, args)
				}
			}
		})
	}
}
