package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
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

	testStatusCode := 404
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
