package logparsingpipeline

import (
	"context"
	"encoding/json"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func TestPipelinePreview(t *testing.T) {
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
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "attributes.test",
					Value:   "val",
					Enabled: true,
					Name:    "test add",
				},
			},
		},
		{
			OrderId: 2,
			Name:    "pipeline2",
			Alias:   "pipeline2",
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
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "resource.test1",
					Value:   "val1",
					Enabled: true,
					Name:    "test add2",
				}, {
					OrderId: 2,
					ID:      "add2",
					Type:    "add",
					Field:   "resource.test2",
					Value:   "val2",
					Enabled: true,
					Name:    "test add3",
				},
			},
		},
	}

	matchingLog := makeTestLogEntry(
		"test log body",
		map[string]string{
			"method": "GET",
		},
	)
	nonMatchingLog := makeTestLogEntry(
		"test log body",
		map[string]string{
			"method": "POST",
		},
	)

	result, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			matchingLog,
			nonMatchingLog,
		},
	)

	require.Nil(err)
	require.Equal(2, len(result))

	// matching log should have been modified as expected.
	require.NotEqual(
		matchingLog.Attributes_string,
		result[0].Attributes_string,
	)
	testAttrValue := result[0].Attributes_string["test"]
	require.NotNil(testAttrValue)
	require.Equal(
		testAttrValue, "val",
	)

	require.Equal(result[0].Resources_string, map[string]string{
		"test1": "val1",
		"test2": "val2",
	})

	// non-matching log should not be touched.
	require.Equal(
		nonMatchingLog.Attributes_string,
		result[1].Attributes_string,
	)
	require.Equal(
		nonMatchingLog.Resources_string,
		result[1].Resources_string,
	)

}

func TestGrokParsingPreview(t *testing.T) {
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
			Config: []PipelineOperator{
				{
					OrderId:   1,
					ID:        "grok",
					Type:      "grok_parser",
					Enabled:   true,
					Name:      "test grok parser",
					OnError:   "send",
					ParseFrom: "body",
					ParseTo:   "attributes",
					Pattern:   "%{TIMESTAMP_ISO8601:timestamp}%{SPACE}%{WORD:log_level}%{SPACE}%{NOTSPACE:location}%{SPACE}%{GREEDYDATA:message}",
				},
			},
		},
	}

	testLog := makeTestLogEntry(
		"2023-10-26T04:38:00.602Z INFO route/server.go:71 HTTP request received",
		map[string]string{
			"method": "GET",
		},
	)
	result, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)

	require.Nil(err)
	require.Equal(1, len(result))
	processed := result[0]

	require.Equal("INFO", processed.Attributes_string["log_level"])
	require.Equal("route/server.go:71", processed.Attributes_string["location"])
}

func TestTraceParsingPreview(t *testing.T) {
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

	result, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)
	require.Nil(err)
	require.Equal(1, len(result))
	processed := result[0]

	require.Equal(testTraceId, processed.TraceID)
	require.Equal(testSpanId, processed.SpanID)

	expectedTraceFlags, err := strconv.ParseUint(testTraceFlags, 16, 16)
	require.Nil(err)
	require.Equal(uint32(expectedTraceFlags), processed.TraceFlags)

	// trace parser should work even if parse_from value is empty
	testPipelines[0].Config[0].SpanId.ParseFrom = ""
	result, err = SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)
	require.Nil(err)
	require.Equal(1, len(result))
	require.Equal("", result[0].SpanID)
}

func makeTestLogEntry(
	body string,
	attributes map[string]string,
) model.SignozLog {
	return model.SignozLog{
		Timestamp:         uint64(time.Now().UnixNano()),
		Body:              body,
		Attributes_string: attributes,
		Resources_string:  map[string]string{},
		SeverityText:      entry.Info.String(),
		SeverityNumber:    uint8(entry.Info),
		SpanID:            uuid.New().String(),
		TraceID:           uuid.New().String(),
	}
}
