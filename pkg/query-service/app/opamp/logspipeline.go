package opamp

import (
	"context"
	"crypto/sha256"
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

func UpsertLogsParsingProcessor(ctx context.Context, parsingProcessors map[string]interface{}, parsingProcessorsNames []interface{}, callback func(string, string, error)) (string, error) {
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

		BuildLogParsingProcessors(c, parsingProcessors)

		// get the processor list
		logs := c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"]
		processors := logs.(map[string]interface{})["processors"].([]interface{})

		// build the new processor list
		updatedProcessorList, _ := buildLogsProcessors(processors, parsingProcessorsNames)

		// add the new processor to the data
		c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"].(map[string]interface{})["processors"] = updatedProcessorList

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
func BuildLogParsingProcessors(agentConf, parsingProcessors map[string]interface{}) error {
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

func buildLogsProcessors(current []interface{}, logsParserPipeline []interface{}) ([]interface{}, error) {
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
		if _, ok := exists[k]; ok || !strings.HasPrefix(k, constants.LogsPPLPfx) {
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
