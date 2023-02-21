package opamp

import (
	"fmt"
	"sync"

	"go.uber.org/zap"
)

var lockTracesPipelinePlan sync.RWMutex

var tracesPipelinePlan = map[int]struct {
	Name    string
	Enabled bool
}{
	0: {
		Name:    "tail_sampling",
		Enabled: false,
	},
	1: {
		Name:    "batch",
		Enabled: true,
	},
}

func updateTracePlan(name string, enabled bool) {
	lockTracesPipelinePlan.Lock()
	defer lockTracesPipelinePlan.Unlock()
	for i := 0; i < len(tracesPipelinePlan); i++ {
		p := tracesPipelinePlan[i]
		if p.Name == name {
			p.Enabled = enabled
			tracesPipelinePlan[i] = p
		}
	}
}

// AddToTracePipeline to enable processor in traces pipeline
func AddToTracePipeline(processor string) {
	updateTracePlan(processor, true)
}

// RemoveFromTracePipeline to remove processor from traces pipeline
func RemoveFromTracePipeline(name string) {
	updateTracePlan(name, false)
}

func checkDuplicates(pipeline []interface{}) bool {
	exists := make(map[string]bool, len(pipeline))
	for _, processor := range pipeline {
		name := processor.(string)
		if _, ok := exists[name]; ok {
			return true
		}

		exists[name] = true
	}
	return false
}

func buildTracesPipeline(pipeline []interface{}) ([]interface{}, error) {

	// create a reverse map of existing config processors and their position
	existing := map[string]int{}
	for i, p := range pipeline {
		name := p.(string)
		existing[name] = i
	}

	// create mapping from our tracesPipelinePlan (processors managed by us) to position in existing processors (from current config)
	// this means, if "batch" holds position 3 in the current effective config, and 2 in our config, the map will be [2]: 3
	plannedVsExistingMap := map[int]int{}

	// go through plan and map its elements to current positions in effective config
	for i, m := range tracesPipelinePlan {
		if loc, ok := existing[m.Name]; ok {
			plannedVsExistingMap[i] = loc
		}
	}

	lastMatched := -1
	inserts := 0

	// go through plan again in the increasing order
	for i := 0; i < len(tracesPipelinePlan); i++ {
		m := tracesPipelinePlan[i]

		if loc, ok := plannedVsExistingMap[i]; ok {
			// element from plan already exists in current effective config.

			currentPos := loc + inserts
			// if disabled then remove from the pipeline
			if !m.Enabled {
				zap.S().Debugf("build_pipeline: found a disabled item, removing from pipeline at position", currentPos-1, " ", m.Name)
				if currentPos-1 <= 0 {
					pipeline = pipeline[currentPos+1:]
				} else {
					pipeline = append(pipeline[:currentPos-1], pipeline[currentPos+1:])
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
					pipeline = append([]interface{}{m.Name}, pipeline[lastMatched+1:])
				} else {
					zap.S().Debugf("build_pipeline: found a new item to be inserted, inserting at position :", lastMatched, " ", m.Name)
					pipeline = append(pipeline[:lastMatched], []interface{}{m.Name}, pipeline[lastMatched+1:])
				}
			}
		}
	}
	if checkDuplicates(pipeline) {
		// duplicates are most likely because the processor sequence in effective config conflicts
		// with the planned sequence as per tracesPipelinePlan
		return pipeline, fmt.Errorf("the effective config has an unexpected processor sequence: %v", pipeline)
	}
	return pipeline, nil
}
