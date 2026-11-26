package agentConf

import (
	"slices"
	"strings"

	yaml "gopkg.in/yaml.v3"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
)

var (
	CodeCollectorConfigUnmarshalFailed = errors.MustNewCode("collector_config_unmarshal_failed")
	CodeCollectorConfigMarshalFailed   = errors.MustNewCode("collector_config_marshal_failed")
)

var loggedProcessorConfs = []string{
	"batch",
	"batch/meter",
	"filter/drop_stale",
	"memory_limiter",
	"signozllmpricing",
	"signozlogsnormalizer",
	"signozspanmapper",
	"signozspanmetrics/delta",
}

// ProcessorsConfByCollectorPipeline keeps config only for log pipeline processors and loggedProcessorConfs, since others can carry secrets.
func ProcessorsConfByCollectorPipeline(collectorConfYaml []byte) (map[string][]byte, error) {
	var collectorConf struct {
		Processors map[string]any `yaml:"processors"`
		Service    struct {
			Pipelines map[string]struct {
				Processors []string `yaml:"processors"`
			} `yaml:"pipelines"`
		} `yaml:"service"`
	}
	if err := yaml.Unmarshal(collectorConfYaml, &collectorConf); err != nil {
		return nil, errors.WrapInvalidInputf(err, CodeCollectorConfigUnmarshalFailed, "could not unmarshal collector config")
	}

	confs := make(map[string][]byte, len(collectorConf.Service.Pipelines))
	for pipeline, pipelineConf := range collectorConf.Service.Pipelines {
		orderedProcessors := make([]any, 0, len(pipelineConf.Processors))
		for _, name := range pipelineConf.Processors {
			if !isProcessorConfLogged(name) {
				orderedProcessors = append(orderedProcessors, name)
				continue
			}
			orderedProcessors = append(orderedProcessors, map[string]any{name: collectorConf.Processors[name]})
		}
		conf, err := yaml.Marshal(orderedProcessors)
		if err != nil {
			return nil, errors.WrapInternalf(err, CodeCollectorConfigMarshalFailed, "could not marshal processors of pipeline %s", pipeline)
		}
		confs[pipeline] = conf
	}
	return confs, nil
}

func isProcessorConfLogged(name string) bool {
	return strings.HasPrefix(name, constants.LogsPPLPfx) || slices.Contains(loggedProcessorConfs, name)
}
