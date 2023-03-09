package opamp

import (
	"fmt"
	"strings"

	"go.uber.org/zap"
)

const logParsePrefix = "logstransform/pipeline"

// check if the processors already exist
// if yes then update the processor.
// if something doesn't exists then remove it.
func BuildLogParsingProcessors(agentConf, parsingProcessors map[string]interface{}) error {
	agentProcessors := agentConf["processors"].(map[string]interface{})
	exists := map[string]struct{}{}
	for key, params := range parsingProcessors {
		agentProcessors[key] = params
		exists[key] = struct{}{}
	}
	// remove the old unwanted processors
	for k := range agentProcessors {
		if _, ok := exists[k]; !ok && strings.HasPrefix(k, logParsePrefix) {
			delete(agentProcessors, k)
		}
	}
	agentConf["processors"] = agentProcessors
	return nil
}

func buildLogsPipeline(current []interface{}, logsParserPipeline []interface{}) ([]interface{}, error) {
	lockLogsPipelineSpec.Lock()
	defer lockLogsPipelineSpec.Unlock()

	exists := map[string]struct{}{}
	for _, v := range logsParserPipeline {
		exists[v.(string)] = struct{}{}
	}

	// removed the old processors which are not used
	var pipeline []interface{}
	for _, v := range current {
		k := v.(string)
		if _, ok := exists[k]; ok || !strings.HasPrefix(k, logParsePrefix) {
			pipeline = append(pipeline, v)
		}
	}

	// create a reverse map of existing config processors and their position
	existing := map[string]int{}
	for i, p := range current {
		name := p.(string)
		existing[name] = i
	}

	// create mapping from our tracesPipelinePlan (processors managed by us) to position in existing processors (from current config)
	// this means, if "batch" holds position 3 in the current effective config, and 2 in our config, the map will be [2]: 3
	specVsExistingMap := map[int]int{}

	// go through plan and map its elements to current positions in effective config
	for i, m := range logsParserPipeline {
		if loc, ok := existing[m.(string)]; ok {
			specVsExistingMap[i] = loc
		}
	}

	lastMatched := 0

	// go through plan again in the increasing order
	for i := 0; i < len(logsParserPipeline); i++ {
		m := logsParserPipeline[i]

		if loc, ok := specVsExistingMap[i]; ok {
			lastMatched = loc + 1
		} else {
			if lastMatched <= 0 {
				zap.S().Debugf("build_pipeline: found a new item to be inserted, inserting at position 0:", m)
				pipeline = append([]interface{}{m}, pipeline[lastMatched:]...)
				lastMatched++
			} else {
				zap.S().Debugf("build_pipeline: found a new item to be inserted, inserting at position :", lastMatched, " ", m)

				prior := make([]interface{}, len(pipeline[:lastMatched]))
				next := make([]interface{}, len(pipeline[lastMatched:]))

				copy(prior, pipeline[:lastMatched])
				copy(next, pipeline[lastMatched:])

				pipeline = append(prior, m)
				pipeline = append(pipeline, next...)
			}
		}
	}

	if checkDuplicates(pipeline) {
		// duplicates are most likely because the processor sequence in effective config conflicts
		// with the planned sequence as per planned pipeline
		return pipeline, fmt.Errorf("the effective config has an unexpected processor sequence: %v", pipeline)
	}

	return pipeline, nil
}
