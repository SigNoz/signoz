package logparsingpipeline

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

const (
	NOOP = "noop"
)

func PreparePipelineProcessor(pipelines []model.Pipeline) (map[string]interface{}, []interface{}, error) {
	processors := map[string]interface{}{}
	names := []interface{}{}
	for _, v := range pipelines {
		if !v.Enabled {
			continue
		}

		operators := []model.PipelineOperator{}
		// remove disabled operators
		for _, operator := range v.Config {
			if operator.Enabled {
				operators = append(operators, operator)
			}
		}

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
