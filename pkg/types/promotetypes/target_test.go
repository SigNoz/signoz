package promotetypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
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
