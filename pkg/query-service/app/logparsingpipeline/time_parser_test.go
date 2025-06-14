package logparsingpipeline

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/stretchr/testify/require"
)

func TestTimestampParsingProcessor(t *testing.T) {
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

	var timestampParserOp pipelinetypes.PipelineOperator
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
	testLog := makeTestSignozLog(
		"test log",
		map[string]interface{}{
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
