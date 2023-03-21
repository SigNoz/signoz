package logparsingpipeline

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var prepareProcessorTestData = []struct {
	Name      string
	Operators []model.PipelineOperator
	Output    []model.PipelineOperator
}{
	{
		Name: "Last operator disabled",
		Operators: []model.PipelineOperator{
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
		Output: []model.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name: "Operator in middle disabled",
		Operators: []model.PipelineOperator{
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
		Output: []model.PipelineOperator{
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
		Operators: []model.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Output:  "t2",
				Enabled: false,
			},
		},
		Output: []model.PipelineOperator{},
	},
	{
		Name: "Single operator enabled",
		Operators: []model.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
		Output: []model.PipelineOperator{
			{
				ID:      "t1",
				Name:    "t1",
				Enabled: true,
			},
		},
	},
	{
		Name:      "Empty operator",
		Operators: []model.PipelineOperator{},
		Output:    []model.PipelineOperator{},
	},
}

func TestPreparePipelineProcessor(t *testing.T) {
	for _, test := range prepareProcessorTestData {
		Convey(test.Name, t, func() {
			res := getOperators(test.Operators)
			So(res, ShouldResemble, test.Output)
		})
	}
}
