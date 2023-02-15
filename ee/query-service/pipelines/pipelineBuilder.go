package pipelines

import (
	"go.signoz.io/signoz/ee/query-service/model"
)

// this file contains methods to transform ingestion rules into
// collector config components
func PreparePipelineProcessor(pipelines []model.Pipeline) (map[string]interface{}, []interface{}, error) {
	processors := map[string]interface{}{}
	names := []interface{}{}
	for _, v := range pipelines {
		if len(v.Config) == 0 {
			continue
		}

		filter := []model.PipelineOperator{
			{
				ID:     "filter_signoz",
				Type:   "filter",
				Expr:   v.Filter,
				Output: v.Config[0].ID,
			},
		}
		v.Config = append(filter, v.Config...)

		processor := model.Processor{
			Operators: v.Config,
		}
		name := "logstransform/pipeline_" + v.Alias
		processors[name] = processor
		names = append(names, name)
	}
	// b, _ := json.Marshal(processors)
	// fmt.Println(string(b))
	return processors, names, nil
}
