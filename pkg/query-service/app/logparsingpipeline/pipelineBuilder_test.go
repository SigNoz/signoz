package logparsingpipeline

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var prepareProcessorTestData = []struct {
	Name      string
	Operators []PipelineOperator
	Output    []PipelineOperator
}{
	{
		Name: "Last operator disabled",
		Operators: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t2",
				Enabled: true,
			},
			{
				ID:      "t2",
				Name:    "t2",
				Enabled: false,
			},
		},
		Output: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name: "Operator in middle disabled",
		Operators: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t2",
				Enabled: true,
			},
			{
				ID:      "t2",
				Name:    "t2",
				Output:  "t3",
				Enabled: false,
			},
			{
				ID:      "t3",
				Name:    "t3",
				Enabled: true,
			},
		},
		Output: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t3",
				Enabled: true,
			},
			{
				ID:      "t3",
				Name:    "t3",
				Enabled: true,
			},
		},
	},
	{
		Name: "Single operator disabled",
		Operators: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t2",
				Enabled: false,
			},
		},
		Output: []PipelineOperator{},
	},
	{
		Name: "Single operator enabled",
		Operators: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
		Output: []PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name:      "Empty operator",
		Operators: []PipelineOperator{},
		Output:    []PipelineOperator{},
	},
	{
		Name: "new test",
		Operators: []PipelineOperator{
			{
				ID:      "move_filename",
				Output:  "move_function",
				Enabled: true,
				Name:    "move_filename",
			},
			{
				ID:      "move_function",
				Output:  "move_line",
				Enabled: false,
				Name:    "move_function",
			},
			{
				ID:      "move_line",
				Output:  "move_lwp",
				Enabled: true,
				Name:    "move_line",
			},
			{
				ID:      "move_lwp",
				Output:  "move_callid",
				Enabled: true,
				Name:    "move_lwp",
			},
			{
				ID:      "move_callid",
				Enabled: true,
				Name:    "move_lwp",
			},
		},
		Output: []PipelineOperator{
			{
				ID:      "move_filename",
				Output:  "move_line",
				Enabled: true,
				Name:    "move_filename",
			},
			{
				ID:      "move_line",
				Output:  "move_lwp",
				Enabled: true,
				Name:    "move_line",
			},
			{
				ID:      "move_lwp",
				Output:  "move_callid",
				Enabled: true,
				Name:    "move_lwp",
			},
			{
				ID:      "move_callid",
				Enabled: true,
				Name:    "move_lwp",
			},
		},
	},
	{
		Name: "first op disabled",
		Operators: []PipelineOperator{
			{
				ID:      "move_filename",
				Output:  "move_function",
				Enabled: false,
				Name:    "move_filename",
			},
			{
				ID:      "move_function",
				Enabled: true,
				Name:    "move_function",
			},
		},
		Output: []PipelineOperator{
			{
				ID:      "move_function",
				Enabled: true,
				Name:    "move_function",
			},
		},
	},
}

func TestPreparePipelineProcessor(t *testing.T) {
	for _, test := range prepareProcessorTestData {
		Convey(test.Name, t, func() {
			res, err := getOperators(test.Operators)
			So(err, ShouldBeNil)
			So(res, ShouldResemble, test.Output)
		})
	}
}

func TestNoCollectorErrorsFromProcessorsForMismatchedLogs(t *testing.T) {
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
	makeTestPipeline := func(config []PipelineOperator) Pipeline {
		return Pipeline{
			OrderId: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  testPipelineFilter,
			Config:  config,
		}
	}

	makeTestLog := func(
		body string,
		attributes map[string]string,
	) model.SignozLog {
		attributes["method"] = "GET"

		testTraceId, err := utils.RandomHex(16)
		require.Nil(err)

		testSpanId, err := utils.RandomHex(8)
		require.Nil(err)

		return model.SignozLog{
			Timestamp:         uint64(time.Now().UnixNano()),
			Body:              body,
			Attributes_string: attributes,
			Resources_string:  attributes,
			SeverityText:      entry.Info.String(),
			SeverityNumber:    uint8(entry.Info),
			SpanID:            testSpanId,
			TraceID:           testTraceId,
		}
	}

	type pipelineTestCase struct {
		Name           string
		Operator       PipelineOperator
		NonMatchingLog model.SignozLog
	}

	testCases := []pipelineTestCase{
		{
			"regex processor should ignore log with missing field",
			PipelineOperator{
				ID:        "regex",
				Type:      "regex_parser",
				Enabled:   true,
				Name:      "regex parser",
				ParseFrom: "attributes.test_regex_target",
				ParseTo:   "attributes",
				Regex:     `^\s*(?P<json_data>{.*})\s*$`,
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"regex processor should ignore non-matching log",
			PipelineOperator{
				ID:        "regex",
				Type:      "regex_parser",
				Enabled:   true,
				Name:      "regex parser",
				ParseFrom: "body",
				ParseTo:   "attributes",
				Regex:     `^\s*(?P<body_json>{.*})\s*$`,
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"json parser should ignore logs with missing field.",
			PipelineOperator{
				ID:        "json",
				Type:      "json_parser",
				Enabled:   true,
				Name:      "json parser",
				ParseFrom: "attributes.test_json",
				ParseTo:   "attributes",
			},
			makeTestLog("mismatching log", map[string]string{}),
		},
		{
			"json parser should ignore log with non JSON target field value",
			PipelineOperator{
				ID:        "json",
				Type:      "json_parser",
				Enabled:   true,
				Name:      "json parser",
				ParseFrom: "attributes.test_json",
				ParseTo:   "attributes",
			},
			makeTestLog("mismatching log", map[string]string{
				"test_json": "bad json",
			}),
		}, {
			"move parser should ignore non matching logs",
			PipelineOperator{
				ID:      "move",
				Type:    "move",
				Enabled: true,
				Name:    "move",
				From:    "attributes.test1",
				To:      "attributes.test2",
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"copy parser should ignore non matching logs",
			PipelineOperator{
				ID:      "copy",
				Type:    "copy",
				Enabled: true,
				Name:    "copy",
				From:    "attributes.test1",
				To:      "attributes.test2",
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"remove parser should ignore non matching logs",
			PipelineOperator{
				ID:      "remove",
				Type:    "remove",
				Enabled: true,
				Name:    "remove",
				Field:   "attributes.test",
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"time parser should ignore logs with missing field.",
			PipelineOperator{
				ID:         "time",
				Type:       "time_parser",
				Enabled:    true,
				Name:       "time parser",
				ParseFrom:  "attributes.test_timestamp",
				LayoutType: "strptime",
				Layout:     "%Y-%m-%dT%H:%M:%S.%f%z",
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"time parser should ignore logs timestamp values that don't contain expected strptime layout.",
			PipelineOperator{
				ID:         "time",
				Type:       "time_parser",
				Enabled:    true,
				Name:       "time parser",
				ParseFrom:  "attributes.test_timestamp",
				LayoutType: "strptime",
				Layout:     "%Y-%m-%dT%H:%M:%S.%f%z",
			},
			makeTestLog("mismatching log", map[string]string{
				"test_timestamp": "2023-11-27T12:03:28A239907+0530",
			}),
		}, {
			"time parser should ignore logs timestamp values that don't contain an epoch",
			PipelineOperator{
				ID:         "time",
				Type:       "time_parser",
				Enabled:    true,
				Name:       "time parser",
				ParseFrom:  "attributes.test_timestamp",
				LayoutType: "epoch",
				Layout:     "s",
			},
			makeTestLog("mismatching log", map[string]string{
				"test_timestamp": "not-an-epoch",
			}),
		}, {
			"grok parser should ignore logs with missing parse from field",
			PipelineOperator{
				ID:        "grok",
				Type:      "grok_parser",
				Enabled:   true,
				Name:      "grok parser",
				ParseFrom: "attributes.test",
				Pattern:   "%{GREEDYDATA}",
				ParseTo:   "attributes.test_parsed",
			},
			makeTestLog("test log with missing parse from field", map[string]string{}),
		},
		// TODO(Raj): see if there is an error scenario for trace parser.
		// TODO(Raj): see if there is an error scenario for Add operator.
	}

	// Some more timeparser test cases
	epochLayouts := []string{"s", "ms", "us", "ns", "s.ms", "s.us", "s.ns"}
	epochTestValues := []string{
		"1136214245", "1136214245123", "1136214245123456",
		"1136214245123456789", "1136214245.123",
		"1136214245.123456", "1136214245.123456789",
	}
	for _, epochLayout := range epochLayouts {
		for _, testValue := range epochTestValues {
			testCases = append(testCases, pipelineTestCase{
				fmt.Sprintf(
					"time parser should ignore log with timestamp value %s that doesn't match layout type %s",
					testValue, epochLayout,
				),
				PipelineOperator{
					ID:         "time",
					Type:       "time_parser",
					Enabled:    true,
					Name:       "time parser",
					ParseFrom:  "attributes.test_timestamp",
					LayoutType: "epoch",
					Layout:     epochLayout,
				},
				makeTestLog("mismatching log", map[string]string{
					"test_timestamp": testValue,
				}),
			})
		}
	}

	for _, testCase := range testCases {
		testPipelines := []Pipeline{makeTestPipeline([]PipelineOperator{testCase.Operator})}

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

func TestResourceFiltersWork(t *testing.T) {
	require := require.New(t)

	testPipeline := Pipeline{
		OrderId: 1,
		Name:    "pipeline1",
		Alias:   "pipeline1",
		Enabled: true,
		Filter: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "service",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: "=",
					Value:    "nginx",
				},
			},
		},
		Config: []PipelineOperator{
			{
				ID:      "add",
				Type:    "add",
				Enabled: true,
				Name:    "add",
				Field:   "attributes.test",
				Value:   "test-value",
			},
		},
	}

	testLog := model.SignozLog{
		Timestamp:         uint64(time.Now().UnixNano()),
		Body:              "test log",
		Attributes_string: map[string]string{},
		Resources_string: map[string]string{
			"service": "nginx",
		},
		SeverityText:   entry.Info.String(),
		SeverityNumber: uint8(entry.Info),
		SpanID:         "",
		TraceID:        "",
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		[]Pipeline{testPipeline},
		[]model.SignozLog{testLog},
	)
	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
	require.Equal(1, len(result))

	require.Equal(result[0].Attributes_string["test"], "test-value")
}

func TestPipelineFilterWithStringOpsShouldNotSpamWarningsIfAttributeIsMissing(t *testing.T) {
	require := require.New(t)

	for _, operator := range []v3.FilterOperator{
		v3.FilterOperatorContains,
		v3.FilterOperatorNotContains,
		v3.FilterOperatorRegex,
		v3.FilterOperatorNotRegex,
	} {
		testPipeline := Pipeline{
			OrderId: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "service",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeResource,
						},
						Operator: operator,
						Value:    "nginx",
					},
				},
			},
			Config: []PipelineOperator{
				{
					ID:      "add",
					Type:    "add",
					Enabled: true,
					Name:    "add",
					Field:   "attributes.test",
					Value:   "test-value",
				},
			},
		}

		testLog := model.SignozLog{
			Timestamp:         uint64(time.Now().UnixNano()),
			Body:              "test log",
			Attributes_string: map[string]string{},
			Resources_string:  map[string]string{},
			SeverityText:      entry.Info.String(),
			SeverityNumber:    uint8(entry.Info),
			SpanID:            "",
			TraceID:           "",
		}

		result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
			context.Background(),
			[]Pipeline{testPipeline},
			[]model.SignozLog{testLog},
		)
		require.Nil(err)
		require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
		require.Equal(1, len(result))
	}
}

func TestAttributePathsContainingDollarDoNotBreakCollector(t *testing.T) {
	require := require.New(t)

	testPipeline := Pipeline{
		OrderId: 1,
		Name:    "pipeline1",
		Alias:   "pipeline1",
		Enabled: true,
		Filter: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "$test",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: "=",
					Value:    "test",
				},
			},
		},
		Config: []PipelineOperator{
			{
				ID:      "move",
				Type:    "move",
				Enabled: true,
				Name:    "move",
				From:    "attributes.$test",
				To:      "attributes.$test1",
			},
		},
	}

	testLogs := []model.SignozLog{
		makeTestSignozLog("test log", map[string]interface{}{
			"$test": "test",
		}),
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		[]Pipeline{testPipeline},
		testLogs,
	)
	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
	require.Equal(1, len(result))
	require.Equal("test", result[0].Attributes_string["$test1"])
}

func TestMembershipOpInProcessorFieldExpressions(t *testing.T) {
	require := require.New(t)

	testLogs := []model.SignozLog{
		makeTestSignozLog("test log", map[string]interface{}{
			"http.method":    "GET",
			"order.products": `{"ids": ["pid0", "pid1"]}`,
		}),
	}

	testPipeline := Pipeline{
		OrderId: 1,
		Name:    "pipeline1",
		Alias:   "pipeline1",
		Enabled: true,
		Filter: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "http.method",
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
				ID:      "move",
				Type:    "move",
				Enabled: true,
				Name:    "move",
				From:    `attributes["http.method"]`,
				To:      `attributes["test.http.method"]`,
			}, {
				ID:        "json",
				Type:      "json_parser",
				Enabled:   true,
				Name:      "json",
				ParseFrom: `attributes["order.products"]`,
				ParseTo:   `attributes["order.products"]`,
			}, {
				ID:      "move1",
				Type:    "move",
				Enabled: true,
				Name:    "move1",
				From:    `attributes["order.products"].ids`,
				To:      `attributes["order.product_ids"]`,
			}, {
				ID:      "move2",
				Type:    "move",
				Enabled: true,
				Name:    "move2",
				From:    `attributes.test?.doesnt_exist`,
				To:      `attributes["test.doesnt_exist"]`,
			}, {
				ID:      "add",
				Type:    "add",
				Enabled: true,
				Name:    "add",
				Field:   `attributes["order.pids"].missing_field`,
				Value:   `EXPR(attributes.a["b.c"].d[4].e + resource.f)`,
			}, {
				ID:      "add2",
				Type:    "add",
				Enabled: true,
				Name:    "add2",
				Field:   `attributes["order.pids.pid0"]`,
				Value:   `EXPR(attributes["order.product_ids"][0])`,
			}, {
				ID:      "add3",
				Type:    "add",
				Enabled: true,
				Name:    "add3",
				Field:   `attributes["attrs.test.value"]`,
				Value:   `EXPR(attributes.test?.value)`,
			}, {
				ID:      "add4",
				Type:    "add",
				Enabled: true,
				Name:    "add4",
				Field:   `attributes["attrs.test.value"]`,
				Value:   `EXPR((attributes.temp?.request_context?.scraper ?? [nil])[0])`,
			},
		},
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		[]Pipeline{testPipeline},
		testLogs,
	)
	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
	require.Equal(1, len(result))

	_, methodAttrExists := result[0].Attributes_string["http.method"]
	require.False(methodAttrExists)
	require.Equal("GET", result[0].Attributes_string["test.http.method"])
	require.Equal("pid0", result[0].Attributes_string["order.pids.pid0"])
}

func TestContainsFilterIsCaseInsensitive(t *testing.T) {
	// The contains and ncontains query builder filters are case insensitive when querying logs.
	// Pipeline filter should also behave in the same way.
	require := require.New(t)

	testLogs := []model.SignozLog{
		makeTestSignozLog("test Ecom Log", map[string]interface{}{}),
	}

	testPipelines := []Pipeline{{
		OrderId: 1,
		Name:    "pipeline1",
		Alias:   "pipeline1",
		Enabled: true,
		Filter: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{{
				Key: v3.AttributeKey{
					Key:      "body",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeUnspecified,
					IsColumn: true,
				},
				Operator: "contains",
				Value:    "log",
			}},
		},
		Config: []PipelineOperator{
			{
				ID:      "add",
				Type:    "add",
				Enabled: true,
				Name:    "add",
				Field:   "attributes.test1",
				Value:   "value1",
			},
		},
	}, {
		OrderId: 2,
		Name:    "pipeline2",
		Alias:   "pipeline2",
		Enabled: true,
		Filter: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{{
				Key: v3.AttributeKey{
					Key:      "body",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeUnspecified,
					IsColumn: true,
				},
				Operator: "ncontains",
				Value:    "ecom",
			}},
		},
		Config: []PipelineOperator{
			{
				ID:      "add",
				Type:    "add",
				Enabled: true,
				Name:    "add",
				Field:   "attributes.test2",
				Value:   "value2",
			},
		},
	}}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(), testPipelines, testLogs,
	)
	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
	require.Equal(1, len(result))

	require.Equal(result[0].Attributes_string["test1"], "value1")

	_, test2Exists := result[0].Attributes_string["test2"]
	require.False(test2Exists)
}
