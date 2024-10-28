package logparsingpipeline

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	coreModel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

var lockLogsPipelineSpec sync.RWMutex

// check if the processors already exist
// if yes then update the processor.
// if something doesn't exists then remove it.
func updateProcessorConfigsInCollectorConf(
	collectorConf map[string]interface{},
	signozPipelineProcessors map[string]interface{},
) error {
	agentProcessors := map[string]interface{}{}
	if collectorConf["processors"] != nil {
		agentProcessors = (collectorConf["processors"]).(map[string]interface{})
	}

	exists := map[string]struct{}{}
	for key, params := range signozPipelineProcessors {
		agentProcessors[key] = params
		exists[key] = struct{}{}
	}
	// remove the old unwanted pipeline processors
	for k := range agentProcessors {
		_, isInDesiredPipelineProcs := exists[k]
		if hasSignozPipelineProcessorPrefix(k) && !isInDesiredPipelineProcs {
			delete(agentProcessors, k)
		}
	}
	collectorConf["processors"] = agentProcessors
	return nil
}

type otelPipeline struct {
	Pipelines struct {
		Logs *struct {
			Exporters  []string `json:"exporters" yaml:"exporters"`
			Processors []string `json:"processors" yaml:"processors"`
			Receivers  []string `json:"receivers" yaml:"receivers"`
		} `json:"logs" yaml:"logs"`
	} `json:"pipelines" yaml:"pipelines"`
}

func getOtelPipelineFromConfig(config map[string]interface{}) (*otelPipeline, error) {
	if _, ok := config["service"]; !ok {
		return nil, fmt.Errorf("service not found in OTEL config")
	}
	b, err := json.Marshal(config["service"])
	if err != nil {
		return nil, err
	}
	p := otelPipeline{}
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func buildCollectorPipelineProcessorsList(
	currentCollectorProcessors []string,
	signozPipelineProcessorNames []string,
) ([]string, error) {
	lockLogsPipelineSpec.Lock()
	defer lockLogsPipelineSpec.Unlock()

	exists := map[string]struct{}{}
	for _, v := range signozPipelineProcessorNames {
		exists[v] = struct{}{}
	}

	// removed the old processors which are not used
	var pipeline []string
	for _, procName := range currentCollectorProcessors {
		_, isInDesiredPipelineProcs := exists[procName]
		if isInDesiredPipelineProcs || !hasSignozPipelineProcessorPrefix(procName) {
			pipeline = append(pipeline, procName)
		}
	}

	// create a reverse map of existing config processors and their position
	existing := map[string]int{}
	for i, p := range pipeline {
		name := p
		existing[name] = i
	}

	// create mapping from our logsParserPipeline to position in existing processors (from current config)
	// this means, if "batch" holds position 3 in the current effective config, and 2 in our config, the map will be [2]: 3
	specVsExistingMap := map[int]int{}
	existingVsSpec := map[int]int{}

	// go through plan and map its elements to current positions in effective config
	for i, m := range signozPipelineProcessorNames {
		if loc, ok := existing[m]; ok {
			specVsExistingMap[i] = loc
			existingVsSpec[loc] = i
		}
	}

	lastMatched := 0
	newPipeline := []string{}

	for i := 0; i < len(signozPipelineProcessorNames); i++ {
		m := signozPipelineProcessorNames[i]
		if loc, ok := specVsExistingMap[i]; ok {
			for j := lastMatched; j < loc; j++ {
				if hasSignozPipelineProcessorPrefix(pipeline[j]) {
					delete(specVsExistingMap, existingVsSpec[j])
				} else {
					newPipeline = append(newPipeline, pipeline[j])
				}
			}
			newPipeline = append(newPipeline, pipeline[loc])
			lastMatched = loc + 1
		} else {
			newPipeline = append(newPipeline, m)
		}

	}
	if lastMatched < len(pipeline) {
		newPipeline = append(newPipeline, pipeline[lastMatched:]...)
	}

	if checkDuplicateString(newPipeline) {
		// duplicates are most likely because the processor sequence in effective config conflicts
		// with the planned sequence as per planned pipeline
		return pipeline, fmt.Errorf("the effective config has an unexpected processor sequence: %v", pipeline)
	}

	return newPipeline, nil
}

func checkDuplicateString(pipeline []string) bool {
	exists := make(map[string]bool, len(pipeline))
	zap.L().Debug("checking duplicate processors in the pipeline:", zap.Any("pipeline", pipeline))
	for _, processor := range pipeline {
		name := processor
		if _, ok := exists[name]; ok {
			zap.L().Error(
				"duplicate processor name detected in generated collector config for log pipelines",
				zap.String("processor", processor),
				zap.Any("pipeline", pipeline),
			)
			return true
		}

		exists[name] = true
	}
	return false
}

func GenerateCollectorConfigWithPipelines(
	config []byte,
	pipelines []Pipeline,
) ([]byte, *coreModel.ApiError) {
	var collectorConf map[string]interface{}
	err := yaml.Unmarshal([]byte(config), &collectorConf)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}

	signozPipelineProcessors, signozPipelineProcNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, coreModel.BadRequest(errors.Wrap(
			err, "could not prepare otel collector processors for log pipelines",
		))
	}

	// Escape any `$`s as `$$$` in config generated for pipelines, to ensure any occurrences
	// like $data do not end up being treated as env vars when loading collector config.
	// otel-collector-contrib versions 0.111 and above require using $$$ as escaped dollar (and not $$)
	for _, procName := range signozPipelineProcNames {
		procConf := signozPipelineProcessors[procName]
		serializedProcConf, err := yaml.Marshal(procConf)
		if err != nil {
			return nil, coreModel.InternalError(fmt.Errorf(
				"could not marshal processor config for %s: %w", procName, err,
			))
		}
		escapedSerializedConf := strings.ReplaceAll(
			string(serializedProcConf), "$", "$$$",
		)

		var escapedConf map[string]interface{}
		err = yaml.Unmarshal([]byte(escapedSerializedConf), &escapedConf)
		if err != nil {
			return nil, coreModel.InternalError(fmt.Errorf(
				"could not unmarshal dollar escaped processor config for %s: %w", procName, err,
			))
		}

		signozPipelineProcessors[procName] = escapedConf
	}

	// Add processors to unmarshaled collector config `c`
	updateProcessorConfigsInCollectorConf(collectorConf, signozPipelineProcessors)

	// build the new processor list in service.pipelines.logs
	p, err := getOtelPipelineFromConfig(collectorConf)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}
	if p.Pipelines.Logs == nil {
		return nil, coreModel.InternalError(fmt.Errorf(
			"logs pipeline doesn't exist",
		))
	}

	updatedProcessorList, _ := buildCollectorPipelineProcessorsList(p.Pipelines.Logs.Processors, signozPipelineProcNames)
	p.Pipelines.Logs.Processors = updatedProcessorList

	// add the new processor to the data ( no checks required as the keys will exists)
	collectorConf["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"] = p.Pipelines.Logs

	updatedConf, err := yaml.Marshal(collectorConf)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}

	return updatedConf, nil
}

func hasSignozPipelineProcessorPrefix(procName string) bool {
	return strings.HasPrefix(procName, constants.LogsPPLPfx) || strings.HasPrefix(procName, constants.OldLogsPPLPfx)
}
