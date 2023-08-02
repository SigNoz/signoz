package logparsingpipeline

import (
	"encoding/json"
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

const (
	NOOP = "noop"
)

func PreparePipelineProcessor(pipelines []model.Pipeline) (map[string]interface{}, []string, error) {
	processors := map[string]interface{}{}
	names := []string{}
	for _, v := range pipelines {
		if !v.Enabled {
			continue
		}

		operators := getOperators(v.Config)
		if len(operators) == 0 {
			continue
		}
		router := []model.PipelineOperator{
			{
				ID:   "router_signoz",
				Type: "router",
				Routes: &[]model.Route{
					{
						Output: v.Config[0].ID,
						Expr:   v.Filter,
					},
				},
				Default: NOOP,
			},
		}

		v.Config = append(router, operators...)

		// noop operator is needed as the default operator so that logs are not dropped
		noop := model.PipelineOperator{
			ID:   NOOP,
			Type: NOOP,
		}
		v.Config = append(v.Config, noop)

		processor := model.Processor{
			Operators: v.Config,
		}
		name := constants.LogsPPLPfx + v.Alias
		processors[name] = processor
		names = append(names, name)
	}
	return processors, names, nil
}

func getOperators(ops []model.PipelineOperator) []model.PipelineOperator {
	filteredOp := []model.PipelineOperator{}
	for i, operator := range ops {
		if operator.Enabled {
			if i > 0 {
				filteredOp[len(filteredOp)-1].Output = operator.ID
			}
			filteredOp = append(filteredOp, operator)
		} else if i == len(ops)-1 && len(filteredOp) != 0 {
			filteredOp[len(filteredOp)-1].Output = ""
		}
	}
	for _, v := range filteredOp {
		x, _ := json.Marshal(v)
		fmt.Println(string(x))
	}
	return filteredOp
}
