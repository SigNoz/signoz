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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND LOWER(attributes['user.id']) LIKE LOWER(?))",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND attributes['user.id'] = ?)",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND attributes['user.id'] IN (?, ?))",
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
			expectedSQL:   "WHERE if(mapContains(attributes, ?), attributes['user.id'] NOT IN (?, ?), true)",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND attributes['user.id'] LIKE ?)",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND LOWER(attributes['user.id']) LIKE LOWER(?))",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND match(attributes['user.id'], ?))",
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
			expectedSQL:   "WHERE (mapContains(intrinsic_attributes, ?) AND intrinsic_attributes['http_method'] = ?)",
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
			expectedSQL:   "WHERE (mapContains(intrinsic_attributes, ?) AND intrinsic_attributes['has_error'] = ?)",
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
			expectedSQL:   "WHERE (mapContains(intrinsic_attributes, ?) AND intrinsic_attributes['severity_text'] = ?)",
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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND mapContains(attributes, 'user.id') = ?)",
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

func TestConditionForComparesNumbersAsStrings(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder(NewFieldMapper())
	key := telemetrytypes.TelemetryFieldKey{
		Name:          "http.status_code",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	sb := sqlbuilder.NewSelectBuilder()
	cond, _, err := conditionBuilder.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, float64(200), sb)
	require.NoError(t, err)
	sb.Where(cond...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	assert.Contains(t, sql, "WHERE (mapContains(attributes, ?) AND attributes['http.status_code'] = ?)")
	assert.Equal(t, []any{"http.status_code", "200"}, args)

	sb = sqlbuilder.NewSelectBuilder()
	cond, _, err = conditionBuilder.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorIn, []any{float64(200), int64(404)}, sb)
	require.NoError(t, err)
	sb.Where(cond...)
	sql, args = sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	assert.Contains(t, sql, "attributes['http.status_code'] IN (?, ?)")
	assert.Equal(t, []any{"http.status_code", "200", "404"}, args)
}
