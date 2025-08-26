package logparsingpipeline

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/stretchr/testify/require"
)

func TestSeverityParsingProcessor(t *testing.T) {
	require := require.New(t)

	testPipelines := []pipelinetypes.GettablePipeline{
		{
			StoreablePipeline: pipelinetypes.StoreablePipeline{
				OrderID: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
			},
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
			Config: []pipelinetypes.PipelineOperator{},
		},
	}

	var severityParserOp pipelinetypes.PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "severity_parser",
			"name": "Test severity parser",
			"id": "test-severity-parser",
			"parse_from": "attributes.test_severity",
			"mapping": {
				"trace": ["test_trace"],
				"debug": ["test_debug", "2xx"],
				"info": ["test_info", "3xx"],
				"warn": ["test_warn", "4xx"],
				"error": ["test_error", "5xx"],
				"fatal": ["test_fatal"]
			},
			"overwrite_text": true
		}
	`), &severityParserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, severityParserOp)

	testCases := []struct {
		severityValues         []interface{}
		expectedSeverityText   string
		expectedSeverityNumber uint8
	}{
		{
			severityValues: []interface{}{
				"test_trace", "TEST_TRACE", "trace", "Trace",
			},
			expectedSeverityText:   "TRACE",
			expectedSeverityNumber: 1,
		},
		{
			severityValues: []interface{}{
				"test_debug", "TEST_DEBUG", "debug", "DEBUG", 202.0,
			},
			expectedSeverityText:   "DEBUG",
			expectedSeverityNumber: 5,
		}, {
			severityValues: []interface{}{
				"test_info", "TEST_INFO", "info", "INFO", 302.0,
			},
			expectedSeverityText:   "INFO",
			expectedSeverityNumber: 9,
		}, {
			severityValues: []interface{}{
				"test_warn", "TEST_WARN", "warn", "WARN", 404.0,
			},
			expectedSeverityText:   "WARN",
			expectedSeverityNumber: 13,
		}, {
			severityValues: []interface{}{
				"test_error", "TEST_ERROR", "error", "ERROR", 500.0,
			},
			expectedSeverityText:   "ERROR",
			expectedSeverityNumber: 17,
		}, {
			severityValues: []interface{}{
				"test_fatal", "TEST_FATAL", "fatal", "FATAL",
			},
			expectedSeverityText:   "FATAL",
			expectedSeverityNumber: 21,
		},
	}

	for _, testCase := range testCases {
		inputLogs := []model.SignozLog{}
		for _, severityAttribValue := range testCase.severityValues {
			inputLogs = append(inputLogs, makeTestSignozLog(
				"test log",
				map[string]interface{}{
					"method":        "GET",
					"test_severity": severityAttribValue,
				},
			))
		}

		result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
			context.Background(),
			testPipelines,
			inputLogs,
		)

		require.Nil(err)
		require.Equal(len(inputLogs), len(result))
		require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
		processed := result[0]

		require.Equal(testCase.expectedSeverityNumber, processed.SeverityNumber)
		require.Equal(testCase.expectedSeverityText, processed.SeverityText)
	}

}

func TestNoCollectorErrorsFromSeverityParserForMismatchedLogs(t *testing.T) {
	require := require.New(t)

	testPipelineFilter := &v3.FilterSet{
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
	}
	makeTestPipeline := func(config []pipelinetypes.PipelineOperator) pipelinetypes.GettablePipeline {
		return pipelinetypes.GettablePipeline{
			StoreablePipeline: pipelinetypes.StoreablePipeline{
				OrderID: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
			},
			Filter: testPipelineFilter,
			Config: config,
		}
	}

	type pipelineTestCase struct {
		Name           string
		Operator       pipelinetypes.PipelineOperator
		NonMatchingLog model.SignozLog
	}

	testCases := []pipelineTestCase{
		{
			"severity parser should ignore logs with missing field",
			pipelinetypes.PipelineOperator{
				ID:        "severity",
				Type:      "severity_parser",
				Enabled:   true,
				Name:      "severity parser",
				ParseFrom: "attributes.test_severity",
				Mapping: map[string][]string{
					"debug": {"debug"},
				},
				OverwriteSeverityText: true,
			},
			makeTestSignozLog("mismatching log", map[string]interface{}{
				"method": "GET",
			}),
		}, {
			"severity parser should ignore logs with invalid values.",
			pipelinetypes.PipelineOperator{
				ID:        "severity",
				Type:      "severity_parser",
				Enabled:   true,
				Name:      "severity parser",
				ParseFrom: "attributes.test_severity",
				Mapping: map[string][]string{
					"debug": {"debug"},
				},
				OverwriteSeverityText: true,
			},
			makeTestSignozLog("mismatching log", map[string]interface{}{
				"method":        "GET",
				"test_severity": 200.3,
			}),
		},
	}

	for _, testCase := range testCases {
		testPipelines := []pipelinetypes.GettablePipeline{makeTestPipeline([]pipelinetypes.PipelineOperator{testCase.Operator})}

		result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
			context.Background(),
			testPipelines,
			[]model.SignozLog{testCase.NonMatchingLog},
		)
		require.Nil(err)
		require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
		require.Equal(1, len(result))
	}
}
