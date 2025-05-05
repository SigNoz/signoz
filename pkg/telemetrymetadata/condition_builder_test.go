package telemetrymetadata

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCondition(t *testing.T) {
	ctx := context.Background()
	conditionBuilder := NewConditionBuilder()

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
			expectedSQL:   "WHERE (mapContains(attributes, ?) AND LOWER(attributes['user.id']) NOT LIKE LOWER(?))",
			expectedError: nil,
		},
	}

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, err := conditionBuilder.GetCondition(ctx, &tc.key, tc.operator, tc.value, sb)
			sb.Where(cond)

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
