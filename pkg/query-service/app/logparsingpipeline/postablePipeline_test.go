package logparsingpipeline

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/model"
)

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
			Filter:  "attributes.method == \"GET\"",
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
			Filter:  "attributes.method == \"GET\"",
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
			Filter:  "attributes.method == \"GET\"",
			Config:  []model.PipelineOperator{},
		},
		IsValid: false,
	},
	{
		Name: "Valid grok",
		Pipeline: PostablePipeline{
			OrderId: 1,
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					Type:    "grok_parser",
					ID:      "Id",
					Pattern: "%{COMMONAPACHELOG}",
					Output:  "attributes",
				},
			},
		},
		IsValid: true,
	},
	{
		Name: "Operator without id",
		Pipeline: PostablePipeline{
			OrderId: 1,
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					Type:    "grok_parser",
					Pattern: "%{COMMONAPACHELOG}",
					Output:  "attributes",
				},
			},
		},
		IsValid: false,
	},
	{
		Name: "Operator without type",
		Pipeline: PostablePipeline{
			OrderId: 1,
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					ID:      "mygrok",
					Pattern: "%{COMMONAPACHELOG}",
					Output:  "attributes",
				},
			},
		},
		IsValid: false,
	},
	{
		Name: "Grok operator without pattern",
		Pipeline: PostablePipeline{
			OrderId: 1,
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					ID:     "mygrok",
					Type:   "grok_parser",
					Output: "attributes",
				},
			},
		},
		IsValid: false,
	},
}

func TestIsValidPostablePipeline(t *testing.T) {
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
