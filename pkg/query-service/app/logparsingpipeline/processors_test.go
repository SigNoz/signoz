package logparsingpipeline

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func TestGrokParsingProcessor(t *testing.T) {
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
	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			testLog,
		},
	)

	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs))
	require.Equal(1, len(result))
	processed := result[0]

	require.Equal("INFO", processed.Attributes_string["log_level"])
	require.Equal("route/server.go:71", processed.Attributes_string["location"])
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

func TestTimestampParsingProcessor(t *testing.T) {
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

	// Start with JSON serialized timestamp parser to validate deserialization too
	// TODO(Raj): Is this needed?
	var timestampParserOp PipelineOperator
	err := json.Unmarshal([]byte(`
		{
			"orderId": 1,
			"enabled": true,
			"type": "time_parser",
			"name": "Test timestamp parser",
			"id": "test-timestamp-parser",
			"parse_from": "attributes.test_timestamp",
			"layout_type": "strptime",
			"layout": "%Y-%m-%dT%H:%M:%S.%f%z"
		}
	`), &timestampParserOp)
	require.Nil(err)
	testPipelines[0].Config = append(testPipelines[0].Config, timestampParserOp)

	testTimestampStr := "2023-11-27T12:03:28.239907+0530"
	testLog := makeTestLogEntry(
		"test log",
		map[string]string{
			"method":         "GET",
			"test_timestamp": testTimestampStr,
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

	expectedTimestamp, err := time.Parse("2006-01-02T15:04:05.999999-0700", testTimestampStr)
	require.Nil(err)

	require.Equal(uint64(expectedTimestamp.UnixNano()), processed.Timestamp)

}
