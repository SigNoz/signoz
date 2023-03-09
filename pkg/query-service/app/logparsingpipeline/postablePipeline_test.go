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
		Name: "Valid grok",
		Pipeline: PostablePipeline{
			OrderId: "0",
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
			OrderId: "0",
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
			OrderId: "0",
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
			OrderId: "0",
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
	{
		Name: "Unknown operator",
		Pipeline: PostablePipeline{
			OrderId: "0",
			Name:    "pipeline 1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter:  "attributes.method == \"GET\"",
			Config: []model.PipelineOperator{
				{
					ID:     "mygrok",
					Type:   "newgrok",
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
