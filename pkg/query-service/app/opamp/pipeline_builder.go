package opamp

import (
	"fmt"
	"strings"
	"sync"

	"go.uber.org/zap"
)

var lockTracesPipelineSpec sync.RWMutex
var lockMetricsPipelineSpec sync.RWMutex
var lockLogsPipelineSpec sync.RWMutex

type pipelineStatus struct {
	Name    string
	Enabled bool
}

var tracesPipelineSpec = map[int]pipelineStatus{
	0: {
		Name:    "signoz_tail_sampling",
		Enabled: false,
	},
	1: {
		Name:    "batch",
		Enabled: true,
	},
}

var metricsPipelineSpec = map[int]pipelineStatus{
	0: {
		Name:    "filter",
		Enabled: false,
	},
	1: {
		Name:    "batch",
		Enabled: true,
	},
}

var logsPipelineSpec = map[int]pipelineStatus{
	0: {
		Name:    "logs",
		Enabled: true,
	},
	1: {
		Name:    "batch",
		Enabled: true,
	},
}

func updatePipelineSpec(signal string, name string, enabled bool) {
	switch signal {
	case "metrics":
		lockMetricsPipelineSpec.Lock()
		defer lockMetricsPipelineSpec.Unlock()

		for i := 0; i < len(metricsPipelineSpec); i++ {
			p := metricsPipelineSpec[i]
			if p.Name == name {
				p.Enabled = enabled
				metricsPipelineSpec[i] = p
			}
		}
	case "traces":
		lockTracesPipelineSpec.Lock()
		defer lockTracesPipelineSpec.Unlock()

		for i := 0; i < len(tracesPipelineSpec); i++ {
			p := tracesPipelineSpec[i]
			if p.Name == name {
				p.Enabled = enabled
				tracesPipelineSpec[i] = p
			}
		}
	default:
		return
	}

}

// AddToTracePipeline to enable processor in traces pipeline
func AddToTracePipelineSpec(processor string) {
	updatePipelineSpec("traces", processor, true)
}

// RemoveFromTracePipeline to remove processor from traces pipeline
func RemoveFromTracePipelineSpec(name string) {
	updatePipelineSpec("traces", name, false)
}

// AddToMetricsPipeline to enable processor in traces pipeline
func AddToMetricsPipelineSpec(processor string) {
	updatePipelineSpec("metrics", processor, true)
}

// RemoveFromMetricsPipeline to remove processor from traces pipeline
func RemoveFromMetricsPipelineSpec(name string) {
	updatePipelineSpec("metrics", name, false)
}

func checkDuplicates(pipeline []interface{}) bool {
	exists := make(map[string]bool, len(pipeline))
	zap.S().Debugf("checking duplicate processors in the pipeline:", pipeline)
	for _, processor := range pipeline {
		name := processor.(string)
		if _, ok := exists[name]; ok {
			return true
		}

		exists[name] = true
	}
	return false
}

func buildPipeline(signal string, current []interface{}) ([]interface{}, error) {
	var spec map[int]pipelineStatus

	switch signal {
	case "metrics":
		spec = metricsPipelineSpec
		lockMetricsPipelineSpec.Lock()
		defer lockMetricsPipelineSpec.Unlock()
	case "traces":
		spec = tracesPipelineSpec
		lockTracesPipelineSpec.Lock()
		defer lockTracesPipelineSpec.Unlock()
	default:
		return nil, fmt.Errorf("invalid signal")
	}

	pipeline := current
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
	for i, m := range spec {
		if loc, ok := existing[m.Name]; ok {
			specVsExistingMap[i] = loc
		}
	}

	lastMatched := -1
	inserts := 0

	// go through plan again in the increasing order
	for i := 0; i < len(spec); i++ {
		m := spec[i]

		if loc, ok := specVsExistingMap[i]; ok {
			// element from plan already exists in current effective config.

			currentPos := loc + inserts
			// if disabled then remove from the pipeline
			if !m.Enabled {
				zap.S().Debugf("build_pipeline: found a disabled item, removing from pipeline at position", currentPos-1, " ", m.Name)
				if currentPos-1 <= 0 {
					pipeline = pipeline[currentPos+1:]
				} else {
					pipeline = append(pipeline[:currentPos-1], pipeline[currentPos+1:]...)
				}
			}

			// capture last position where match was found,  this will be used
			// to insert missing elements next to it
			lastMatched = currentPos

		} else {
			if m.Enabled {
				// track inserts as they shift the elements in pipeline
				inserts++

				// we use last matched to insert new item.  This means, we keep inserting missing processors
				// right after last matched processsor (e.g. insert filters after tail_sampling for existing list of [batch, tail_sampling])

				if lastMatched <= 0 {
					zap.S().Debugf("build_pipeline: found a new item to be inserted, inserting at position 0:", m.Name)
					pipeline = append([]interface{}{m.Name}, pipeline[lastMatched+1:]...)
				} else {
					zap.S().Debugf("build_pipeline: found a new item to be inserted, inserting at position :", lastMatched, " ", m.Name)
					prior := pipeline[:lastMatched]
					next := pipeline[lastMatched+1:]

					pipeline = append(prior, []interface{}{m.Name})
					pipeline = append(pipeline, next...)
				}
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
	// var spec map[int]pipelineStatus

	// switch signal {
	// case "logs":
	// spec = logsPipelineSpec
	lockLogsPipelineSpec.Lock()
	defer lockLogsPipelineSpec.Unlock()
	// }

	// remove unwanted pipeline processor
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

	//  := current
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
	// inserts := 0

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
