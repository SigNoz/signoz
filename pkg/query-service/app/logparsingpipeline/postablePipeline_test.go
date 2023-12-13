package logparsingpipeline

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestIsValidPostablePipeline(t *testing.T) {
	validPipelineFilterSet := &v3.FilterSet{
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

	var correctQueriesTest = []struct {
		Name     string
		Pipeline PostablePipeline
		IsValid  bool
	}{
		{
			Name: "No orderId",
			Pipeline: PostablePipeline{
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config:  []PipelineOperator{},
			},
			IsValid: false,
		},
		{
			Name: "Invalid orderId",
			Pipeline: PostablePipeline{
				OrderId: 0,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config:  []PipelineOperator{},
			},
			IsValid: false,
		},
		{
			Name: "Valid orderId",
			Pipeline: PostablePipeline{
				OrderId: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
				Config:  []PipelineOperator{},
			},
			IsValid: true,
		},
		{
			Name: "Invalid filter",
			Pipeline: PostablePipeline{
				OrderId: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "method",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeUnspecified,
							},
							Operator: "regex",
							Value:    "[0-9A-Z*",
						},
					},
				},
			},
			IsValid: false,
		},
		{
			Name: "Valid filter",
			Pipeline: PostablePipeline{
				OrderId: 1,
				Name:    "pipeline 1",
				Alias:   "pipeline1",
				Enabled: true,
				Filter:  validPipelineFilterSet,
			},
			IsValid: true,
		},
	}

	for _, test := range correctQueriesTest {
		Convey(test.Name, t, func() {
			err := test.Pipeline.IsValid()
			if test.IsValid {
				So(err, ShouldBeNil)
			} else {
				So(err, ShouldBeError)
			}
		})
	}
}

var operatorTest = []struct {
	Name     string
	Operator PipelineOperator
	IsValid  bool
}{
	{
		Name: "Operator - without id",
		Operator: PipelineOperator{
			Type:  "remove",
			Field: "attributes.abc",
		},
		IsValid: false,
	},
	{
		Name: "Operator - without type",
		Operator: PipelineOperator{
			ID:    "test",
			Field: "attributes.abc",
		},
		IsValid: false,
	},
	{
		Name: "Copy - invalid to and from",
		Operator: PipelineOperator{
			ID:   "copy",
			Type: "copy",
			From: "date",
			To:   "attributes",
		},
		IsValid: false,
	},
	{
		Name: "Move - invalid to and from",
		Operator: PipelineOperator{
			ID:   "move",
			Type: "move",
			From: "attributes",
			To:   "data",
		},
		IsValid: false,
	},
	{
		Name: "Add - invalid to and from",
		Operator: PipelineOperator{
			ID:    "add",
			Type:  "add",
			Field: "data",
		},
		IsValid: false,
	},
	{
		Name: "Remove - invalid to and from",
		Operator: PipelineOperator{
			ID:    "remove",
			Type:  "remove",
			Field: "data",
		},
		IsValid: false,
	},
	{
		Name: "Add - valid",
		Operator: PipelineOperator{
			ID:    "add",
			Type:  "add",
			Field: "body",
			Value: "val",
		},
		IsValid: true,
	},
	{
		Name: "Move - valid",
		Operator: PipelineOperator{
			ID:   "move",
			Type: "move",
			From: "attributes.x1",
			To:   "attributes.x2",
		},
		IsValid: true,
	},
	{
		Name: "Copy - valid",
		Operator: PipelineOperator{
			ID:   "copy",
			Type: "copy",
			From: "resource.x1",
			To:   "resource.x2",
		},
		IsValid: true,
	},
	{
		Name: "Unknown operator",
		Operator: PipelineOperator{
			ID:   "copy",
			Type: "operator",
			From: "resource.x1",
			To:   "resource.x2",
		},
		IsValid: false,
	},
	{
		Name: "Grok - valid",
		Operator: PipelineOperator{
			ID:      "grok",
			Type:    "grok_parser",
			Pattern: "%{COMMONAPACHELOG}",
			ParseTo: "attributes",
		},
		IsValid: true,
	},
	{
		Name: "Grok - invalid",
		Operator: PipelineOperator{
			ID:      "grok",
			Type:    "grok_parser",
			Pattern: "%{COMMONAPACHELOG}",
			ParseTo: "test",
		},
		IsValid: false,
	},
	{
		Name: "Regex - valid",
		Operator: PipelineOperator{
			ID:      "regex",
			Type:    "regex_parser",
			Regex:   "(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$",
			ParseTo: "attributes",
		},
		IsValid: true,
	},
	{
		Name: "Regex - invalid",
		Operator: PipelineOperator{
			ID:      "regex",
			Type:    "regex_parser",
			Regex:   "abcd",
			ParseTo: "attributes",
		},
		IsValid: false,
	}, {
		Name: "Trace Parser - invalid - no trace_parser spec",
		Operator: PipelineOperator{
			ID:   "trace",
			Type: "trace_parser",
		},
		IsValid: false,
	}, {
		Name: "Trace Parser - invalid - no ParseFrom specified",
		Operator: PipelineOperator{
			ID:          "trace",
			Type:        "trace_parser",
			TraceParser: &TraceParser{},
		},
		IsValid: false,
	}, {
		Name: "Trace Parser - invalid - bad parsefrom attribute",
		Operator: PipelineOperator{
			ID:   "trace",
			Type: "trace_parser",
			TraceParser: &TraceParser{
				TraceId: &ParseFrom{ParseFrom: "trace_id"},
			},
		},
		IsValid: false,
	}, {
		Name: "Timestamp Parser - valid",
		Operator: PipelineOperator{
			ID:         "time",
			Type:       "time_parser",
			ParseFrom:  "attributes.test_timestamp",
			LayoutType: "epoch",
			Layout:     "s",
		},
		IsValid: true,
	}, {
		Name: "Timestamp Parser - invalid - bad parsefrom attribute",
		Operator: PipelineOperator{
			ID:         "time",
			Type:       "time_parser",
			ParseFrom:  "timestamp",
			LayoutType: "epoch",
			Layout:     "s",
		},
		IsValid: false,
	}, {
		Name: "Timestamp Parser - unsupported layout_type",
		Operator: PipelineOperator{
			ID:        "time",
			Type:      "time_parser",
			ParseFrom: "attributes.test_timestamp",
			// TODO(Raj): Maybe add support for gotime format
			LayoutType: "gotime",
			Layout:     "Mon Jan 2 15:04:05 -0700 MST 2006",
		},
		IsValid: false,
	}, {
		Name: "Timestamp Parser - invalid epoch layout",
		Operator: PipelineOperator{
			ID:         "time",
			Type:       "time_parser",
			ParseFrom:  "attributes.test_timestamp",
			LayoutType: "epoch",
			Layout:     "%Y-%m-%d",
		},
		IsValid: false,
	}, {
		Name: "Timestamp Parser - invalid strptime layout",
		Operator: PipelineOperator{
			ID:         "time",
			Type:       "time_parser",
			ParseFrom:  "attributes.test_timestamp",
			LayoutType: "strptime",
			Layout:     "%U",
		},
		IsValid: false,
	}, {
		Name: "Severity Parser - valid",
		Operator: PipelineOperator{
			ID:        "severity",
			Type:      "severity_parser",
			ParseFrom: "attributes.test_severity",
			SeverityMapping: map[string][]string{
				"trace": {"test_trace"},
				"fatal": {"test_fatal"},
			},
			OverwriteSeverityText: true,
		},
		IsValid: true,
	}, {
		Name: "Severity Parser - Parse from is required",
		Operator: PipelineOperator{
			ID:                    "severity",
			Type:                  "severity_parser",
			SeverityMapping:       map[string][]string{},
			OverwriteSeverityText: true,
		},
		IsValid: false,
	}, {
		Name: "Severity Parser - mapping level must be valid",
		Operator: PipelineOperator{
			ID:        "severity",
			Type:      "severity_parser",
			ParseFrom: "attributes.test",
			SeverityMapping: map[string][]string{
				"not-a-level": {"bad-level"},
			},
			OverwriteSeverityText: true,
		},
		IsValid: false,
	},
}

func TestValidOperator(t *testing.T) {
	for _, test := range operatorTest {
		Convey(test.Name, t, func() {
			err := isValidOperator(test.Operator)
			if test.IsValid {
				So(err, ShouldBeNil)
			} else {
				So(err, ShouldBeError)
			}
		})
	}
}
