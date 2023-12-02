package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/antonmedv/expr"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestRegexForStrptimeLayout(t *testing.T) {
	require := require.New(t)

	var testCases = []struct {
		strptimeLayout string
		str            string
		shouldMatch    bool
	}{
		{
			strptimeLayout: "%Y-%m-%dT%H:%M:%S.%f%z",
			str:            "2023-11-26T12:03:28.239907+0530",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%d-%m-%Y",
			str:            "26-11-2023",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%d-%m-%Y",
			str:            "26-11-2023",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%d/%m/%y",
			str:            "11/03/02",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%A, %d. %B %Y %I:%M%p",
			str:            "Tuesday, 21. November 2006 04:30PM11/03/02",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%A, %d. %B %Y %I:%M%p",
			str:            "some random text",
			shouldMatch:    false,
		},
	}

	for _, test := range testCases {
		regex, err := RegexForStrptimeLayout(test.strptimeLayout)
		require.Nil(err, test.strptimeLayout)

		code := fmt.Sprintf(`"%s" matches "%s"`, test.str, regex)
		program, err := expr.Compile(code)
		require.Nil(err, test.strptimeLayout)

		output, err := expr.Run(program, map[string]string{})
		require.Nil(err, test.strptimeLayout)
		require.Equal(output, test.shouldMatch, test.strptimeLayout)

	}
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
