package opamp

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.uber.org/zap"
)

var lockLogsPipelineSpec sync.RWMutex

func UpsertLogsParsingProcessor(ctx context.Context, parsingProcessors map[string]interface{}, parsingProcessorsNames []string, callback func(string, string, error)) (string, error) {
	confHash := ""
	if opAmpServer == nil {
		return confHash, fmt.Errorf("opamp server is down, unable to push config to agent at this moment")
	}

	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) == 0 {
		return confHash, fmt.Errorf("no agents available at the moment")
	}

	for _, agent := range agents {
		config := agent.EffectiveConfig
		c, err := yaml.Parser().Unmarshal([]byte(config))
		if err != nil {
			return confHash, err
		}

		buildLogParsingProcessors(c, parsingProcessors)

		p, err := getOtelPipelinFromConfig(c)
		if err != nil {
			return confHash, err
		}
		if p.Pipelines.Logs == nil {
			return confHash, fmt.Errorf("logs pipeline doesn't exist")
		}

		// build the new processor list
		updatedProcessorList, _ := buildLogsProcessors(p.Pipelines.Logs.Processors, parsingProcessorsNames)
		p.Pipelines.Logs.Processors = updatedProcessorList

		// add the new processor to the data ( no checks required as the keys will exists)
		c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"] = p.Pipelines.Logs

		updatedConf, err := yaml.Parser().Marshal(c)
		if err != nil {
			return confHash, err
		}

		// zap.S().Infof("sending new config", string(updatedConf))
		hash := sha256.New()
		_, err = hash.Write(updatedConf)
		if err != nil {
			return confHash, err
		}
		agent.EffectiveConfig = string(updatedConf)
		err = agent.Upsert()
		if err != nil {
			return confHash, err
		}

		agent.SendToAgent(&protobufs.ServerToAgent{
			RemoteConfig: &protobufs.AgentRemoteConfig{
				Config: &protobufs.AgentConfigMap{
					ConfigMap: map[string]*protobufs.AgentConfigFile{
						"collector.yaml": {
							Body:        updatedConf,
							ContentType: "application/x-yaml",
						},
					},
				},
				ConfigHash: hash.Sum(nil),
			},
		})

		if confHash == "" {
			confHash = string(hash.Sum(nil))
			model.ListenToConfigUpdate(agent.ID, confHash, callback)
		}
	}

	return confHash, nil
}

// check if the processors already exist
// if yes then update the processor.
// if something doesn't exists then remove it.
func buildLogParsingProcessors(agentConf, parsingProcessors map[string]interface{}) error {
	agentProcessors := agentConf["processors"].(map[string]interface{})
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

func getOtelPipelinFromConfig(config map[string]interface{}) (*otelPipeline, error) {
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
	zap.S().Debugf("checking duplicate processors in the pipeline:", pipeline)
	for _, processor := range pipeline {
		name := processor
		if _, ok := exists[name]; ok {
			return true
		}

		exists[name] = true
	}
	return false
}
