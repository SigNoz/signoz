package opamp

import (
	"fmt"
	"sync"

	"go.uber.org/zap"
)

var lockTracesPipelineSpec sync.RWMutex
var lockMetricsPipelineSpec sync.RWMutex

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
	zap.L().Debug("checking duplicate processors in the pipeline", zap.Any("pipeline", pipeline))
	for _, processor := range pipeline {
		name := processor.(string)
		if _, ok := exists[name]; ok {
			return true
		}

		exists[name] = true
	}
	return false
}

func buildPipeline(signal Signal, current []interface{}) ([]interface{}, error) {
	var spec map[int]pipelineStatus

	switch signal {
	case Metrics:
		spec = metricsPipelineSpec
		lockMetricsPipelineSpec.Lock()
		defer lockMetricsPipelineSpec.Unlock()
	case Traces:
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
				zap.L().Debug("build_pipeline: found a disabled item, removing from pipeline at position", zap.Int("position", currentPos-1), zap.String("processor", m.Name))
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
					zap.L().Debug("build_pipeline: found a new item to be inserted, inserting at position 0", zap.String("processor", m.Name))
					pipeline = append([]interface{}{m.Name}, pipeline[lastMatched+1:]...)
				} else {
					zap.L().Debug("build_pipeline: found a new item to be inserted, inserting at position", zap.Int("position", lastMatched), zap.String("processor", m.Name))
					prior := make([]interface{}, len(pipeline[:lastMatched]))
					next := make([]interface{}, len(pipeline[lastMatched:]))
					copy(prior, pipeline[:lastMatched])
					copy(next, pipeline[lastMatched:])

					pipeline = append(prior, m.Name)
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
