package logparsingpipeline

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestSeverityParsingProcessor(t *testing.T) {
	require := require.New(t)

	testPipelines := []Pipeline{
		{
			OrderId: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{},
		},
	}

	var severityParserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "severity_parser",
			"name": "Test severity parser",
			"id": "test-severity-parser",
			"parse_from": "attributes.test_severity",
			"mapping": {
				"debug": ["test_debug", "2xx"],
				"info": ["test_info", "3xx"],
				"warn": ["test_warn", "4xx"],
				"error": ["test_error", "5xx"]
			},
			"overwrite_text": true
		}
	`), &severityParserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, severityParserOp)

	testCases := []struct {
		severityValue          interface{}
		expectedSeverityText   string
		expectedSeverityNumber uint8
	}{
		{
			severityValue:          "test_debug",
			expectedSeverityText:   "DEBUG",
			expectedSeverityNumber: 5,
		}, {
			severityValue:          "test_info",
			expectedSeverityText:   "INFO",
			expectedSeverityNumber: 9,
		}, {
			severityValue:          "test_warn",
			expectedSeverityText:   "WARN",
			expectedSeverityNumber: 13,
		}, {
			severityValue:          "test_error",
			expectedSeverityText:   "ERROR",
			expectedSeverityNumber: 17,
		},
	}

	for _, testCase := range testCases {

		testLog := makeTestSignozLog(
			"test log",
			map[string]interface{}{
				"method":        "GET",
				"test_severity": testCase.severityValue,
			},
		)

		result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
			context.Background(),
			testPipelines,
			[]model.SignozLog{
				testLog,
			},
		)
		require.Nil(err)
		require.Equal(1, len(result))
		require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
		processed := result[0]

		require.Equal(testCase.expectedSeverityNumber, processed.SeverityNumber)
		require.Equal(testCase.expectedSeverityText, processed.SeverityText)
	}

}
