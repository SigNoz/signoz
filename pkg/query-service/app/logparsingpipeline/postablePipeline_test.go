package logparsingpipeline

import (
	"encoding/json"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
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
	validPipelineFilter, err := json.Marshal(validPipelineFilterSet)
	require.Nil(t, err)

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
				Filter:  string(validPipelineFilter),
				Config:  []model.PipelineOperator{},
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
				Filter:  string(validPipelineFilter),
				Config:  []model.PipelineOperator{},
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
				Filter:  string(validPipelineFilter),
				Config:  []model.PipelineOperator{},
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
				Filter:  "test filter",
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
				Filter:  string(validPipelineFilter),
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
	Operator model.PipelineOperator
	IsValid  bool
}{
	{
		Name: "Operator - without id",
		Operator: model.PipelineOperator{
			Type:  "remove",
			Field: "attributes.abc",
		},
		IsValid: false,
	},
	{
		Name: "Operator - without type",
		Operator: model.PipelineOperator{
			ID:    "test",
			Field: "attributes.abc",
		},
		IsValid: false,
	},
	{
		Name: "Copy - invalid to and from",
		Operator: model.PipelineOperator{
			ID:   "copy",
			Type: "copy",
			From: "date",
			To:   "attributes",
		},
		IsValid: false,
	},
	{
		Name: "Move - invalid to and from",
		Operator: model.PipelineOperator{
			ID:   "move",
			Type: "move",
			From: "attributes",
			To:   "data",
		},
		IsValid: false,
	},
	{
		Name: "Add - invalid to and from",
		Operator: model.PipelineOperator{
			ID:    "add",
			Type:  "add",
			Field: "data",
		},
		IsValid: false,
	},
	{
		Name: "Remove - invalid to and from",
		Operator: model.PipelineOperator{
			ID:    "remove",
			Type:  "remove",
			Field: "data",
		},
		IsValid: false,
	},
	{
		Name: "Add - valid",
		Operator: model.PipelineOperator{
			ID:    "add",
			Type:  "add",
			Field: "body",
			Value: "val",
		},
		IsValid: true,
	},
	{
		Name: "Move - valid",
		Operator: model.PipelineOperator{
			ID:   "move",
			Type: "move",
			From: "attributes.x1",
			To:   "attributes.x2",
		},
		IsValid: true,
	},
	{
		Name: "Copy - valid",
		Operator: model.PipelineOperator{
			ID:   "copy",
			Type: "copy",
			From: "resource.x1",
			To:   "resource.x2",
		},
		IsValid: true,
	},
	{
		Name: "Unknown operator",
		Operator: model.PipelineOperator{
			ID:   "copy",
			Type: "operator",
			From: "resource.x1",
			To:   "resource.x2",
		},
		IsValid: false,
	},
	{
		Name: "Grok - valid",
		Operator: model.PipelineOperator{
			ID:      "grok",
			Type:    "grok_parser",
			Pattern: "%{COMMONAPACHELOG}",
			ParseTo: "attributes",
		},
		IsValid: true,
	},
	{
		Name: "Grok - invalid",
		Operator: model.PipelineOperator{
			ID:      "grok",
			Type:    "grok_parser",
			Pattern: "%{COMMONAPACHELOG}",
			ParseTo: "test",
		},
		IsValid: false,
	},
	{
		Name: "Regex - valid",
		Operator: model.PipelineOperator{
			ID:      "regex",
			Type:    "regex_parser",
			Regex:   "(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$",
			ParseTo: "attributes",
		},
		IsValid: true,
	},
	{
		Name: "Regex - invalid",
		Operator: model.PipelineOperator{
			ID:      "regex",
			Type:    "regex_parser",
			Regex:   "abcd",
			ParseTo: "attributes",
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
