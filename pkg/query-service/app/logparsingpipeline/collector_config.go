package logparsingpipeline

import (
	"encoding/json"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
)

var lockLogsPipelineSpec sync.RWMutex

var (
	CodeCollectorConfigUnmarshalFailed        = errors.MustNewCode("collector_config_unmarshal_failed")
	CodeCollectorConfigMarshalFailed          = errors.MustNewCode("collector_config_marshal_failed")
	CodeCollectorConfigServiceNotFound        = errors.MustNewCode("collector_config_service_not_found")
	CodeCollectorConfigServiceMarshalFailed   = errors.MustNewCode("collector_config_service_marshal_failed")
	CodeCollectorConfigServiceUnmarshalFailed = errors.MustNewCode("collector_config_service_unmarshal_failed")
	CodeCollectorConfigLogsPipelineNotFound   = errors.MustNewCode("collector_config_logs_pipeline_not_found")
)

const (
	memoryLimiterProcessor       = "memory_limiter"
	memoryLimiterProcessorPrefix = "memory_limiter/"
	batchProcessor               = "batch"
	batchProcessorPrefix         = "batch/"
)

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
		return nil, errors.NewInvalidInputf(CodeCollectorConfigServiceNotFound, "service not found in OTEL config")
	}
	b, err := json.Marshal(config["service"])
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeCollectorConfigServiceMarshalFailed, "could not marshal OTEL config")
	}
	p := otelPipeline{}
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, errors.WrapInternalf(err, CodeCollectorConfigServiceUnmarshalFailed, "could not unmarshal OTEL config")
	}
	return &p, nil
}

// buildCollectorPipelineProcessorsList assembles the final processor list in the
// required order:
//
//  1. memory_limiter processors (any processor named "memory_limiter" or "memory_limiter/<id>")
//  2. other existing processors (in their original order), which may include signoz processors
//     that are not user-pipeline processors
//  3. signoz user-pipeline processors
//  4. batch processors (any processor named "batch" or "batch/<id>")
func buildCollectorPipelineProcessorsList(
	currentCollectorProcessors []string,
	signozPipelineProcessorNames []string,
) ([]string, error) {
	lockLogsPipelineSpec.Lock()
	defer lockLogsPipelineSpec.Unlock()

	// Build a set of the desired signoz processors so we can drop any stale version
	// of them (regardless of how they got into the current config) without
	// accidentally duplicating them in the output.
	desiredUserPipelineSet := make(map[string]struct{}, len(signozPipelineProcessorNames))
	for _, p := range signozPipelineProcessorNames {
		desiredUserPipelineSet[p] = struct{}{}
	}

	result := make([]string, 0, len(currentCollectorProcessors)+len(signozPipelineProcessorNames))

	// Note: logic assumes there'll be only one batch processor
	var batchProcIdx int
	var batchProcFound bool
iteration:
	for idx, p := range currentCollectorProcessors {
		_, inDesiredSet := desiredUserPipelineSet[p]
		switch {
		// same processor exist; retain the location of pre-existing location
		case p == memoryLimiterProcessor || strings.HasPrefix(p, memoryLimiterProcessorPrefix):
			result = append(result, p)
		case hasSignozPipelineProcessorPrefix(p):
			// this processor has been dropped
			if !inDesiredSet {
				continue iteration
			} else {
				result = append(result, p)
			}
		case p == batchProcessor || strings.HasPrefix(p, batchProcessorPrefix):
			batchProcIdx = idx
			batchProcFound = true
			break iteration
		default:
			result = append(result, p)
		}

		if inDesiredSet {
			// delete from desired pipeline set so they're not added twice
			delete(desiredUserPipelineSet, p)
		}
	}
	// add user pipelines
	for _, proc := range signozPipelineProcessorNames {
		_, add := desiredUserPipelineSet[proc]
		if add {
			result = append(result, proc)
		}
	}

	// add batch processor and rest
	if batchProcFound {
		result = append(result, currentCollectorProcessors[batchProcIdx:]...)
	}
	return result, nil
}

func GenerateCollectorConfigWithPipelines(config []byte, pipelines []pipelinetypes.GettablePipeline) ([]byte, error) {
	var collectorConf map[string]interface{}
	err := yaml.Unmarshal([]byte(config), &collectorConf)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, CodeCollectorConfigUnmarshalFailed, "could not unmarshal collector config")
	}

	signozPipelineProcessors, signozPipelineProcNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, err
	}

	// Escape any `$`s as `$$$` in config generated for pipelines, to ensure any occurrences
	// like $data do not end up being treated as env vars when loading collector config.
	for _, procName := range signozPipelineProcNames {
		procConf := signozPipelineProcessors[procName]
		serializedProcConf, err := yaml.Marshal(procConf)
		if err != nil {
			return nil, errors.WrapInternalf(err, CodeCollectorConfigMarshalFailed, "could not marshal processor config for %s", procName)
		}
		escapedSerializedConf := strings.ReplaceAll(
			string(serializedProcConf), "$", "$$",
		)

		var escapedConf map[string]interface{}
		err = yaml.Unmarshal([]byte(escapedSerializedConf), &escapedConf)
		if err != nil {
			return nil, errors.WrapInternalf(err, CodeCollectorConfigUnmarshalFailed, "could not unmarshal dollar escaped processor config for %s", procName)
		}

		signozPipelineProcessors[procName] = escapedConf
	}

	// Add processors to unmarshaled collector config `c`
	updateProcessorConfigsInCollectorConf(collectorConf, signozPipelineProcessors)

	// build the new processor list in service.pipelines.logs
	p, err := getOtelPipelineFromConfig(collectorConf)
	if err != nil {
		return nil, err
	}
	if p.Pipelines.Logs == nil {
		return nil, errors.NewInternalf(CodeCollectorConfigLogsPipelineNotFound, "logs pipeline doesn't exist")
	}

	updatedProcessorList, _ := buildCollectorPipelineProcessorsList(p.Pipelines.Logs.Processors, signozPipelineProcNames)
	p.Pipelines.Logs.Processors = updatedProcessorList

	// add the new processor to the data ( no checks required as the keys will exists)
	collectorConf["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"] = p.Pipelines.Logs

	updatedConf, err := yaml.Marshal(collectorConf)
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeCollectorConfigMarshalFailed, "could not marshal collector config")
	}

	return updatedConf, nil
}

func hasSignozPipelineProcessorPrefix(procName string) bool {
	return strings.HasPrefix(procName, constants.LogsPPLPfx) || strings.HasPrefix(procName, constants.OldLogsPPLPfx)
}
