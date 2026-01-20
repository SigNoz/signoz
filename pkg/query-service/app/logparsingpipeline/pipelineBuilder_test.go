package logparsingpipeline

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	signozstanzahelper "github.com/SigNoz/signoz-otel-collector/processor/signozlogspipelineprocessor/stanza/operator/helper"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/require"
)

var prepareProcessorTestData = []struct {
	Name      string
	Operators []pipelinetypes.PipelineOperator
	Output    []pipelinetypes.PipelineOperator
}{
	{
		Name: "Last operator disabled",
		Operators: []pipelinetypes.PipelineOperator{
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
		Output: []pipelinetypes.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name: "Operator in middle disabled",
		Operators: []pipelinetypes.PipelineOperator{
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
		Output: []pipelinetypes.PipelineOperator{
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
		Operators: []pipelinetypes.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t2",
				Enabled: false,
			},
		},
		Output: []pipelinetypes.PipelineOperator{},
	},
	{
		Name: "Single operator enabled",
		Operators: []pipelinetypes.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
		Output: []pipelinetypes.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name:      "Empty operator",
		Operators: []pipelinetypes.PipelineOperator{},
		Output:    []pipelinetypes.PipelineOperator{},
	},
	{
		Name: "new test",
		Operators: []pipelinetypes.PipelineOperator{
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
		Output: []pipelinetypes.PipelineOperator{
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
		Operators: []pipelinetypes.PipelineOperator{
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
		Output: []pipelinetypes.PipelineOperator{
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
	makeTestPipeline := func(config []pipelinetypes.PipelineOperator) pipelinetypes.GettablePipeline {
		return pipelinetypes.GettablePipeline{
			StoreablePipeline: pipelinetypes.StoreablePipeline{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				OrderID: 1,
				Name:    "pipeline1",
				Alias:   "pipeline1",
				Enabled: true,
			},
			Filter: testPipelineFilter,
			Config: config,
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
		Operator       pipelinetypes.PipelineOperator
		NonMatchingLog model.SignozLog
	}

	testCases := []pipelineTestCase{
		{
			"regex processor should ignore log with missing field",
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
				ID:      "remove",
				Type:    "remove",
				Enabled: true,
				Name:    "remove",
				Field:   "attributes.test",
			},
			makeTestLog("mismatching log", map[string]string{}),
		}, {
			"time parser should ignore logs with missing field.",
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
			pipelinetypes.PipelineOperator{
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
				pipelinetypes.PipelineOperator{
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

func TestResourceFiltersWork(t *testing.T) {
	require := require.New(t)

	testPipeline := pipelinetypes.GettablePipeline{
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
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
						Key:      "service",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeResource,
					},
					Operator: "=",
					Value:    "nginx",
				},
			},
		},
		Config: []pipelinetypes.PipelineOperator{
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
		[]pipelinetypes.GettablePipeline{testPipeline},
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
		testPipeline := pipelinetypes.GettablePipeline{
			StoreablePipeline: pipelinetypes.StoreablePipeline{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
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
							Key:      "service",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeResource,
						},
						Operator: operator,
						Value:    "nginx",
					},
				},
			},
			Config: []pipelinetypes.PipelineOperator{
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
			[]pipelinetypes.GettablePipeline{testPipeline},
			[]model.SignozLog{testLog},
		)
		require.Nil(err)
		require.Equal(0, len(collectorWarnAndErrorLogs), strings.Join(collectorWarnAndErrorLogs, "\n"))
		require.Equal(1, len(result))
	}
}

func TestAttributePathsContainingDollarDoNotBreakCollector(t *testing.T) {
	require := require.New(t)

	testPipeline := pipelinetypes.GettablePipeline{
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
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
						Key:      "$test",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: "=",
					Value:    "test",
				},
			},
		},
		Config: []pipelinetypes.PipelineOperator{
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
		[]pipelinetypes.GettablePipeline{testPipeline},
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
		makeTestSignozLog("test log", map[string]any{
			"http.method":    "GET",
			"order.products": `{"ids": ["pid0", "pid1"]}`,
		}),
	}

	testPipeline := pipelinetypes.GettablePipeline{
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
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
						Key:      "http.method",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					Operator: "=",
					Value:    "GET",
				},
			},
		},
		Config: []pipelinetypes.PipelineOperator{
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
		[]pipelinetypes.GettablePipeline{testPipeline},
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

	testPipelines := []pipelinetypes.GettablePipeline{{
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrderID: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
		},
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
		Config: []pipelinetypes.PipelineOperator{
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
		StoreablePipeline: pipelinetypes.StoreablePipeline{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrderID: 2,
			Name:    "pipeline2",
			Alias:   "pipeline2",
			Enabled: true,
		},
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
		Config: []pipelinetypes.PipelineOperator{
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

func TestProcessJSONParser_WithFlatteningAndMapping(t *testing.T) {
	parserID := uuid.NewString()
	outputID := uuid.NewString()

	parent := &pipelinetypes.PipelineOperator{
		Type:             "json_parser",
		ID:               parserID,
		Name:             "Parse JSON",
		OrderId:          1,
		Enabled:          true,
		ParseFrom:        "body",
		ParseTo:          "attributes",
		Output:           outputID,
		EnableFlattening: true,
		EnablePaths:      false,
		PathPrefix:       "",
		Mapping: map[string][]string{
			pipelinetypes.Host:        {"host", "hostname"},
			pipelinetypes.Service:     {"service", "syslog.appname"},
			pipelinetypes.Severity:    {"status", "severity", "level", "syslog.severity"},
			pipelinetypes.TraceID:     {"trace_id"},
			pipelinetypes.SpanID:      {"span_id"},
			pipelinetypes.Message:     {"message", "msg", "log"},
			pipelinetypes.TraceFlags:  {"flags"},
			pipelinetypes.Environment: {"service.env"},
		},
	}

	// Total children generated = sum(len(mapping values)) + severity_parser + trace_parser ops
	expectedMoveOps := len(parent.Mapping[pipelinetypes.Host]) +
		len(parent.Mapping[pipelinetypes.Service]) +
		len(parent.Mapping[pipelinetypes.Message]) +
		len(parent.Mapping[pipelinetypes.Environment])
	expectedTraceOps := len(parent.Mapping[pipelinetypes.TraceID]) +
		len(parent.Mapping[pipelinetypes.SpanID]) +
		len(parent.Mapping[pipelinetypes.TraceFlags])
	expectedSeverityOps := len(parent.Mapping[pipelinetypes.Severity]) // severity_parser

	totalOps := expectedMoveOps + expectedTraceOps + expectedSeverityOps

	ops, err := processJSONParser(parent)
	require.NoError(t, err)
	require.NotEmpty(t, ops)

	// Parent is always first
	parentOp := ops[0]
	require.Equal(t, "json_parser", parentOp.Type)
	require.Equal(t, 1, parentOp.MaxFlatteningDepth)
	require.Nil(t, parentOp.Mapping) // Mapping should be removed
	require.Nil(t, parent.Mapping)   // Mapping should be removed
	require.Contains(t, parentOp.If, `isJSON(body)`)
	require.Contains(t, parentOp.If, `type(body)`)

	require.Equal(t, 1+totalOps, len(ops))

	var traceParserCount, moveCount, severityParserCount int
	for _, op := range ops[1:] {
		require.NotEmpty(t, op.ID)
		require.Equal(t, op.OnError, signozstanzahelper.SendOnErrorQuiet)

		switch op.Type {
		case "move":
			require.NotEmpty(t, op.From)
			require.NotEmpty(t, op.To)
			moveCount++
		case "trace_parser":
			require.NotNil(t, op.TraceParser)
			traceParserCount++
		case "severity_parser":
			require.NotEmpty(t, op.ParseFrom)
			require.NotEmpty(t, op.If)
			severityParserCount++
		default:
			t.Errorf("unexpected operator type: %s", op.Type)
		}
	}

	require.Equal(t, expectedMoveOps, moveCount)
	require.Equal(t, expectedTraceOps, traceParserCount)
	require.Equal(t, expectedSeverityOps, severityParserCount)
}

func TestProcessJSONParser_WithoutMapping(t *testing.T) {
	parent := &pipelinetypes.PipelineOperator{
		Type:             "json_parser",
		ID:               uuid.NewString(),
		Name:             "Parse JSON",
		OrderId:          1,
		Enabled:          true,
		ParseFrom:        "body",
		ParseTo:          "attributes",
		EnableFlattening: true,
		EnablePaths:      true,
		PathPrefix:       "parsed",
		Mapping:          nil, // No mapping
	}

	ops, err := processJSONParser(parent)
	require.NoError(t, err)
	require.Len(t, ops, 1) // Only the parent operator should exist

	op := ops[0]
	require.Equal(t, "json_parser", op.Type)
	require.Equal(t, 1, op.MaxFlatteningDepth)
	require.True(t, op.EnableFlattening)
	require.True(t, op.EnablePaths)
	require.Equal(t, "parsed", op.PathPrefix)
	require.Contains(t, op.If, `isJSON(body)`)
}

func TestProcessJSONParser_Simple(t *testing.T) {
	parent := &pipelinetypes.PipelineOperator{
		Type:      "json_parser",
		ID:        uuid.NewString(),
		Name:      "Parse JSON",
		OrderId:   1,
		Enabled:   true,
		ParseFrom: "body",
		ParseTo:   "attributes",
	}

	ops, err := processJSONParser(parent)
	require.NoError(t, err)
	require.Len(t, ops, 1) // Only the parent operator should exist

	op := ops[0]
	require.Equal(t, "json_parser", op.Type)
	require.Equal(t, 0, op.MaxFlatteningDepth)
	require.False(t, op.EnableFlattening)
	require.False(t, op.EnablePaths)
	require.Equal(t, "", op.PathPrefix)
	require.Contains(t, op.If, `isJSON(body)`)
}

func TestProcessJSONParser_InvalidType(t *testing.T) {
	parent := &pipelinetypes.PipelineOperator{
		Type: "copy", // Invalid type
	}

	_, err := processJSONParser(parent)
	require.Error(t, err)
	require.Contains(t, err.Error(), "operator type received copy")
}
