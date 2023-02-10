package pipelines

import (
	"encoding/json"
	"fmt"

	"go.signoz.io/signoz/ee/query-service/model"
)

// this file contains methods to transform ingestion rules into
// collector config components
func PreparePipelineProcessor(pipelines []model.Pipeline) (map[string]interface{}, error) {
	// todo(nitya): add prefix to the names
	// todo(nitya): add filter processor in the beginning
	processors := map[string]interface{}{}
	for _, v := range pipelines {
		processor := model.Processor{
			Operators: v.Config,
		}
		processors["logstransform/"+v.Alias] = processor
	}
	// data
	b, _ := json.Marshal(processors)
	fmt.Println(string(b))
	return processors, nil
}
