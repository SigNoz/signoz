package logparsingpipeline

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
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

	matchingLog := makeTestSignozLog(
		"test log body",
		map[string]interface{}{
			"method": "GET",
		},
	)
	nonMatchingLog := makeTestSignozLog(
		"test log body",
		map[string]interface{}{
			"method": "POST",
		},
	)

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			matchingLog,
			nonMatchingLog,
		},
	)

	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs))
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

	testLog := makeTestSignozLog(
		"2023-10-26T04:38:00.602Z INFO route/server.go:71 HTTP request received",
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
	require.Equal(0, len(collectorWarnAndErrorLogs))
	require.Equal(1, len(result))
	processed := result[0]

	require.Equal("INFO", processed.Attributes_string["log_level"])
	require.Equal("route/server.go:71", processed.Attributes_string["location"])
}

func makeTestSignozLog(
	body string,
	attributes map[string]interface{},
) model.SignozLog {

	testLog := model.SignozLog{
		Timestamp:          uint64(time.Now().UnixNano()),
		Body:               body,
		Attributes_bool:    map[string]bool{},
		Attributes_string:  map[string]string{},
		Attributes_int64:   map[string]int64{},
		Attributes_float64: map[string]float64{},
		Resources_string:   map[string]string{},
		SeverityText:       entry.Info.String(),
		SeverityNumber:     uint8(entry.Info),
		SpanID:             uuid.New().String(),
		TraceID:            uuid.New().String(),
	}

	for k, v := range attributes {
		switch v := v.(type) {
		case bool:
			testLog.Attributes_bool[k] = v
		case string:
			testLog.Attributes_string[k] = v
		case int:
			testLog.Attributes_int64[k] = int64(v)
		case float64:
			testLog.Attributes_float64[k] = v
		default:
			panic(fmt.Sprintf("found attribute value of unsupported type %T in test log", v))
		}
	}

	return testLog
}
