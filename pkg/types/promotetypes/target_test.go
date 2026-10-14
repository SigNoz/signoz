package promotetypes

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIndexExpression(t *testing.T) {
	testCases := []struct {
		name         string
		target       Target
		column       string
		path         string
		jsonDataType string
		want         string
	}{
		{
			name:         "LogsString_LoweredOverAssumeNotNull",
			target:       NewLogsBodyTarget(),
			column:       "body_promoted",
			path:         "user.name",
			jsonDataType: "String",
			want:         "lower(assumeNotNull(dynamicElement(body_promoted.user.name, 'String')))",
		},
		{
			name:         "LogsNumber_AssumeNotNullOnly",
			target:       NewLogsBodyTarget(),
			column:       "body_v2",
			path:         "request.duration",
			jsonDataType: "Float64",
			want:         "assumeNotNull(dynamicElement(body_v2.request.duration, 'Float64'))",
		},
		{
			name:         "TracesString_TypeCastOnly",
			target:       NewTracesAttributesTarget(),
			column:       "attributes_promoted",
			path:         "http.method",
			jsonDataType: "String",
			want:         "attributes_promoted.`http.method`::String",
		},
		{
			name:         "TracesPathNeedingBackticks_Backticked",
			target:       NewTracesAttributesTarget(),
			column:       "attributes",
			path:         "user-name",
			jsonDataType: "String",
			want:         "attributes.`user-name`::String",
		},
		{
			name:         "TracesFloat64_QuerierNumberRead",
			target:       NewTracesAttributesTarget(),
			column:       "attributes",
			path:         "http.status_code",
			jsonDataType: "Float64",
			want:         "toFloat64OrNull(attributes.`http.status_code`::String)",
		},
		{
			name:         "TracesInt64_QuerierNumberRead",
			target:       NewTracesAttributesTarget(),
			column:       "attributes_promoted",
			path:         "retry.count",
			jsonDataType: "Int64",
			want:         "toFloat64OrNull(attributes_promoted.`retry.count`::String)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.target.IndexExpression(testCase.column, testCase.path, testCase.jsonDataType))
		})
	}
}

func TestIndexDataType(t *testing.T) {
	testCases := []struct {
		name         string
		target       Target
		jsonDataType telemetrytypes.JSONDataType
		want         telemetrytypes.JSONDataType
	}{
		{name: "TracesInt64_Float64", target: NewTracesAttributesTarget(), jsonDataType: telemetrytypes.Int64, want: telemetrytypes.Float64},
		{name: "TracesString_Unchanged", target: NewTracesAttributesTarget(), jsonDataType: telemetrytypes.String, want: telemetrytypes.String},
		{name: "LogsInt64_Unchanged", target: NewLogsBodyTarget(), jsonDataType: telemetrytypes.Int64, want: telemetrytypes.Int64},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.target.IndexDataType(testCase.jsonDataType))
		})
	}
}

// An index is used only when a filter's left-hand side is its exact expression.
func TestTracesNumberIndexExpr_MatchesQuerierFilters(t *testing.T) {
	release := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	queryInfo := qbtypes.QueryInfo{StartNs: uint64(release.AddDate(0, 6, 0).UnixNano()), EndNs: uint64(release.AddDate(0, 7, 0).UnixNano()), TraceAttrsJSONOn: true}
	key := telemetrytypes.TelemetryFieldKey{Name: "http.status_code", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber, Evolutions: tracestelemetryschema.MockAttributeEvolutionData(release)}
	indexExpr := NewTracesAttributesTarget().IndexExpression("attributes", "http.status_code", telemetrytypes.Float64.StringValue())

	testCases := []struct {
		name     string
		operator qbtypes.FilterOperator
		value    any
		want     string
	}{
		{name: "Equal", operator: qbtypes.FilterOperatorEqual, value: float64(200), want: indexExpr + " = ?"},
		{name: "In", operator: qbtypes.FilterOperatorIn, value: []any{float64(200), float64(404)}, want: indexExpr + " = ? OR " + indexExpr + " = ?"},
		{name: "GreaterThan", operator: qbtypes.FilterOperatorGreaterThan, value: float64(200), want: indexExpr + " > ?"},
		{name: "Between", operator: qbtypes.FilterOperatorBetween, value: []any{float64(200), float64(299)}, want: indexExpr + " BETWEEN ? AND ?"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sb := sqlbuilder.NewSelectBuilder()
			conditions, _, err := querybuilder.Conditions(context.Background(), queryInfo, tracestelemetryschema.NewStorage(), &key, testCase.operator, testCase.value, map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, false, sb)
			require.NoError(t, err)
			sb.Where(conditions...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Contains(t, sql, testCase.want)
		})
	}
}
