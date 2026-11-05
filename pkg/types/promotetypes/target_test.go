package promotetypes

import (
	"testing"

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
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.target.IndexExpression(testCase.column, testCase.path, testCase.jsonDataType))
		})
	}
}
