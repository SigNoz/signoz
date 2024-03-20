package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

// Tests for pipeline processors other than the ones
// covered in dedicated files.

func TestRegexProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "regex_parser",
			"name": "Test regex parser",
			"id": "test-regex-parser",
			"parse_from": "body",
			"parse_to": "attributes",
			"regex": "PAN: (?P<pan>[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}) "
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testPan := "GDTSJ4756E"
	testLog := makeTestSignozLog(
		fmt.Sprintf("test string with PAN: %s and some more text", testPan),
		map[string]interface{}{
			"method": "GET",
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
	require.Equal(testPan, processed.Attributes_string["pan"])
}

func TestGrokProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "grok_parser",
			"name": "Test grok parser",
			"id": "test-grok-parser",
			"parse_from": "body",
			"parse_to": "attributes",
			"pattern": "status: %{INT:http_status_code:int}"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testStatusCode := int64(404)
	testLog := makeTestSignozLog(
		fmt.Sprintf("some http log with status: %d and some more text", testStatusCode),
		map[string]interface{}{
			"method": "GET",
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
	require.Equal(testStatusCode, processed.Attributes_int64["http_status_code"])
}

func TestJSONProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "json_parser",
			"name": "Test json parser",
			"id": "test-json-parser",
			"parse_from": "body",
			"parse_to": "attributes"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testLog := makeTestSignozLog(
		`{"test_str": "value", "test_float": 1.1}`,
		map[string]interface{}{
			"method": "GET",
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
	require.Equal("value", processed.Attributes_string["test_str"])
	require.Equal(1.1, processed.Attributes_float64["test_float"])
}

func TestTraceParsingProcessor(t *testing.T) {
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

	// Start with JSON serialized trace parser to validate deserialization too
	var traceParserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "trace_parser",
			"name": "Test trace parser",
			"id": "test-trace-parser",
			"trace_id": {
					"parse_from": "attributes.test_trace_id"
			},
			"span_id": {
					"parse_from": "attributes.test_span_id"
			},
			"trace_flags": {
					"parse_from": "attributes.test_trace_flags"
			}
		}
	`), &traceParserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, traceParserOp)

	testTraceId, err := utils.RandomHex(16)
	require.Nil(err)

	testSpanId, err := utils.RandomHex(8)
	require.Nil(err)

	testTraceFlags, err := utils.RandomHex(1)
	require.Nil(err)

	testLog := model.SignozLog{
		Timestamp: uint64(time.Now().UnixNano()),
		Body:      "test log",
		Attributes_string: map[string]string{
			"method":           "GET",
			"test_trace_id":    testTraceId,
			"test_span_id":     testSpanId,
			"test_trace_flags": testTraceFlags,
		},
		SpanID:     "",
		TraceID:    "",
		TraceFlags: 0,
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)
	require.Nil(err)
	require.Equal(1, len(result))
	require.Equal(0, len(collectorWarnAndErrorLogs))
	processed := result[0]

	require.Equal(testTraceId, processed.TraceID)
	require.Equal(testSpanId, processed.SpanID)

	expectedTraceFlags, err := strconv.ParseUint(testTraceFlags, 16, 16)
	require.Nil(err)
	require.Equal(uint32(expectedTraceFlags), processed.TraceFlags)

	// trace parser should work even if parse_from value is empty
	testPipelines[0].Config[0].SpanId.ParseFrom = ""
	result, collectorWarnAndErrorLogs, err = SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)
	require.Nil(err)
	require.Equal(1, len(result))
	require.Equal(0, len(collectorWarnAndErrorLogs))
	require.Equal("", result[0].SpanID)
}

func TestAddProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "add",
			"name": "Test add parser",
			"id": "test-add-parser",
			"field": "attributes.test",
			"value": "test"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testLog := makeTestSignozLog(
		"test log",
		map[string]interface{}{
			"method": "GET",
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
	require.Equal("test", processed.Attributes_string["test"])
}

func TestRemoveProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "remove",
			"name": "Test remove parser",
			"id": "test-remove-parser",
			"field": "attributes.method"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testLog := makeTestSignozLog(
		"test log",
		map[string]interface{}{
			"method": "GET",
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
	_, methodExists := processed.Attributes_string["method"]
	require.False(methodExists)
}

func TestCopyProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "copy",
			"name": "Test copy parser",
			"id": "test-add-parser",
			"from": "attributes.method",
			"to": "attributes.copied_method"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testLog := makeTestSignozLog(
		"test log",
		map[string]interface{}{
			"method": "GET",
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
	require.Equal("GET", processed.Attributes_string["method"])
	require.Equal("GET", processed.Attributes_string["copied_method"])
}

func TestMoveProcessor(t *testing.T) {
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

	var parserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "move",
			"name": "Test move parser",
			"id": "test-move-parser",
			"from": "attributes.method",
			"to": "attributes.moved_method"
		}
	`), &parserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, parserOp)

	testLog := makeTestSignozLog(
		"test log",
		map[string]interface{}{
			"method": "GET",
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
	require.Equal("", processed.Attributes_string["method"])
	require.Equal("GET", processed.Attributes_string["moved_method"])
}
