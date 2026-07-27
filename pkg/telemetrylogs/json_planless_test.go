package telemetrylogs

import (
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

func TestExhaustiveJSONPlan_ConditionBuilder(t *testing.T) {
	cases := []struct {
		name         string
		path         string
		operator     qbtypes.FilterOperator
		value        any
		valueType    telemetrytypes.FieldDataType
		expectedSQL  string
		expectedArgs []any
	}{
		{
			name:         "single hop array, both containers",
			path:         "education[].name",
			operator:     qbtypes.FilterOperatorEqual,
			value:        "IIT",
			valueType:    telemetrytypes.FieldDataTypeString,
			expectedSQL:  "(((arrayExists(`body_v2.education`-> dynamicElement(`body_v2.education`.`name`, 'String') = ?, dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education`-> dynamicElement(`body_v2.education`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(body_v2.`education`, 'Array(Dynamic)')))))) AND has(JSONAllPaths(body_v2), 'education'))",
			expectedArgs: []any{"IIT", "IIT"},
		},
		{
			name:         "double hop array, both containers each hop",
			path:         "education[].awards[].name",
			operator:     qbtypes.FilterOperatorEqual,
			value:        "Iron Award",
			valueType:    telemetrytypes.FieldDataTypeString,
			expectedSQL:  "(((arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(body_v2.`education`, 'Array(Dynamic)')))))) AND has(JSONAllPaths(body_v2), 'education'))",
			expectedArgs: []any{"Iron Award", "Iron Award", "Iron Award", "Iron Award"},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			key := &telemetrytypes.TelemetryFieldKey{
				Name:         c.path,
				Signal:       telemetrytypes.SignalLogs,
				FieldContext: telemetrytypes.FieldContextBody,
			}
			require.Empty(t, key.JSONPlan)
			require.NoError(t, key.SetExhaustiveJSONAccessPlan(
				telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, c.valueType))

			sb := sqlbuilder.NewSelectBuilder()
			cond, err := NewJSONConditionBuilder(key, c.valueType).buildJSONCondition(c.operator, c.value, sb)
			require.NoError(t, err)

			sb.Select("1").From("t").Where(cond)
			sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			where := sql[strings.Index(sql, "WHERE ")+len("WHERE "):]
			t.Logf("WHERE: %s", where)

			require.Equal(t, c.expectedArgs, args)
			if c.expectedSQL != "" {
				require.Equal(t, c.expectedSQL, where)
			}
		})
	}
}

func TestExhaustiveJSONPlan_FieldMapper(t *testing.T) {
	m := &fieldMapper{}

	key := &telemetrytypes.TelemetryFieldKey{
		Name:          "education[].name",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextBody,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	expr, err := m.buildFieldForJSON(key)
	require.NoError(t, err)
	require.Equal(t,
		"arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->dynamicElement(`body_v2.education`.`name`, 'String'), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')), arrayMap(`body_v2.education`->dynamicElement(`body_v2.education`.`name`, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(body_v2.`education`, 'Array(Dynamic)'))))))",
		expr)
}
