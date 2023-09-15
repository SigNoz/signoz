package logparsingpipeline

import (
	"encoding/json"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/queryBuilderToExpr"
)

const (
	NOOP = "noop"
)

func CollectorConfProcessorName(p model.Pipeline) string {
	return constants.LogsPPLPfx + p.Alias
}

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

		filterExpr, err := PipelineFilterExpr(v.Filter)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to parse pipeline filter")
		}

		router := []model.PipelineOperator{
			{
				ID:   "router_signoz",
				Type: "router",
				Routes: &[]model.Route{
					{
						Output: v.Config[0].ID,
						Expr:   filterExpr,
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
		name := CollectorConfProcessorName(v)
		processors[name] = processor
		names = append(names, name)
	}
	return processors, names, nil
}

func PipelineFilterExpr(serializedFilter string) (string, error) {
	var filterset v3.FilterSet
	err := json.Unmarshal([]byte(serializedFilter), &filterset)
	if err != nil {
		return "", errors.Wrap(err, "could not unmarshal pipeline filterset json")
	}

	filterExpr, err := queryBuilderToExpr.Parse(&filterset)
	if err != nil {
		return "", errors.Wrap(err, "could not convert pipeline filterset to expr")
	}

	return filterExpr, nil
}

func getOperators(ops []model.PipelineOperator) []model.PipelineOperator {
	filteredOp := []model.PipelineOperator{}
	for i, operator := range ops {
		if operator.Enabled {
			if len(filteredOp) > 0 {
				filteredOp[len(filteredOp)-1].Output = operator.ID
			}
			filteredOp = append(filteredOp, operator)
		} else if i == len(ops)-1 && len(filteredOp) != 0 {
			filteredOp[len(filteredOp)-1].Output = ""
		}
	}
	return filteredOp
}
