package pipelines

import (
	"go.signoz.io/signoz/ee/query-service/model"
)

// PostablePipelines are a list of user defined pielines
type PostablePipelines struct {
	Pipelines []PostablePipeline `json:"pipelines"`
}

// PostablePipeline captures user inputs in setting the pipeline

type PostablePipeline struct {
	Id      string                   `json:"id"`
	OrderId string                   `json:"orderId"`
	Name    string                   `json:"name"`
	Alias   string                   `json:"alias"`
	Enabled bool                     `json:"enabled"`
	Filter  string                   `json:"filter"`
	Config  []model.PipelineOperator `json:"config"`
}

// // IsValid checks if postable pipeline has all the required params
func (p *PostablePipeline) IsValid() *model.ApiError {
	if p.Name == "" {
		return model.BadRequestStr("pipeline name is required")
	}

	if p.Alias == "" {
		return model.BadRequestStr("pipeline alias is required")
	}

	if p.Filter == "" {
		return model.BadRequestStr("pipeline filter is required")
	}

	return nil
}
