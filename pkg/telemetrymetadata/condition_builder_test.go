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
				sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expectedSQL)
			}
		})
	}
}
