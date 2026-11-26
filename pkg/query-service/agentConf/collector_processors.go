package agentConf

import (
	yaml "gopkg.in/yaml.v3"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	CodeCollectorConfigUnmarshalFailed = errors.MustNewCode("collector_config_unmarshal_failed")
	CodeCollectorConfigMarshalFailed   = errors.MustNewCode("collector_config_marshal_failed")
)

// ProcessorsConfByCollectorPipeline returns, for each service pipeline, the configs of its
// processors in run order as a list of single-key maps, so a processor listed twice is kept twice.
// Exporters, extensions and receivers carry secrets and are left out.
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
		orderedProcessors := make([]map[string]any, 0, len(pipelineConf.Processors))
		for _, name := range pipelineConf.Processors {
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
