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
func buildLogParsingProcessors(agentConf, parsingProcessors map[string]interface{}) error {
	agentProcessors := map[string]interface{}{}
	if agentConf["processors"] != nil {
		agentProcessors = (agentConf["processors"]).(map[string]interface{})
	}

	exists := map[string]struct{}{}
	for key, params := range parsingProcessors {
		agentProcessors[key] = params
		exists[key] = struct{}{}
	}
	// remove the old unwanted processors
	for k := range agentProcessors {
		if _, ok := exists[k]; !ok && strings.HasPrefix(k, constants.LogsPPLPfx) {
			delete(agentProcessors, k)
		}
	}
	agentConf["processors"] = agentProcessors
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

func buildLogsProcessors(current []string, logsParserPipeline []string) ([]string, error) {
	lockLogsPipelineSpec.Lock()
	defer lockLogsPipelineSpec.Unlock()

	exists := map[string]struct{}{}
	for _, v := range logsParserPipeline {
		exists[v] = struct{}{}
	}

	// removed the old processors which are not used
	var pipeline []string
	for _, v := range current {
		k := v
		if _, ok := exists[k]; ok || !strings.HasPrefix(k, constants.LogsPPLPfx) {
			pipeline = append(pipeline, v)
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
	for i, m := range logsParserPipeline {
		if loc, ok := existing[m]; ok {
			specVsExistingMap[i] = loc
			existingVsSpec[loc] = i
		}
	}

	lastMatched := 0
	newPipeline := []string{}

	for i := 0; i < len(logsParserPipeline); i++ {
		m := logsParserPipeline[i]
		if loc, ok := specVsExistingMap[i]; ok {
			for j := lastMatched; j < loc; j++ {
				if strings.HasPrefix(pipeline[j], constants.LogsPPLPfx) {
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
	var c map[string]interface{}
	err := yaml.Unmarshal([]byte(config), &c)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}

	processors, procNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, coreModel.BadRequest(errors.Wrap(
			err, "could not prepare otel collector processors for log pipelines",
		))
	}

	// Escape any `$`s as `$$` in config generated for pipelines, to ensure any occurrences
	// like $data do not end up being treated as env vars when loading collector config.
	for _, procName := range procNames {
		procConf := processors[procName]
		serializedProcConf, err := yaml.Marshal(procConf)
		if err != nil {
			return nil, coreModel.InternalError(fmt.Errorf(
				"could not marshal processor config for %s: %w", procName, err,
			))
		}
		escapedSerializedConf := strings.ReplaceAll(
			string(serializedProcConf), "$", "$$",
		)

		var escapedConf map[string]interface{}
		err = yaml.Unmarshal([]byte(escapedSerializedConf), &escapedConf)
		if err != nil {
			return nil, coreModel.InternalError(fmt.Errorf(
				"could not unmarshal dollar escaped processor config for %s: %w", procName, err,
			))
		}

		processors[procName] = escapedConf
	}

	// Add processors to unmarshaled collector config `c`
	buildLogParsingProcessors(c, processors)

	// build the new processor list in service.pipelines.logs
	p, err := getOtelPipelineFromConfig(c)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}
	if p.Pipelines.Logs == nil {
		return nil, coreModel.InternalError(fmt.Errorf(
			"logs pipeline doesn't exist",
		))
	}

	updatedProcessorList, _ := buildLogsProcessors(p.Pipelines.Logs.Processors, procNames)
	p.Pipelines.Logs.Processors = updatedProcessorList

	// add the new processor to the data ( no checks required as the keys will exists)
	c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"] = p.Pipelines.Logs

	updatedConf, err := yaml.Marshal(c)
	if err != nil {
		return nil, coreModel.BadRequest(err)
	}

	return updatedConf, nil
}
