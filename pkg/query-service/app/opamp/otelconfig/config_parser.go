package otelconfig

import (
	"fmt"
	"io/ioutil"
	"sync"

	"github.com/knadh/koanf/parsers/yaml"
	"go.opentelemetry.io/collector/confmap"
)

const (
	receiversKey  = "receivers"
	processorsKey = "processors"
	pipelinesKey  = "pipelines"
	serviceKey    = "service"
	exportersKey  = "exporters"
)

type ConfigParser struct {
	lock      sync.Mutex
	agentConf *confmap.Conf
}

func NewConfigParser(agentConf *confmap.Conf) ConfigParser {
	return ConfigParser{
		agentConf: agentConf,
	}
}

func LoadConfigParserFromFile(filename string) (*ConfigParser, error) {
	yamlFile, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to load default collector config in opamp server: %v", err)
	}

	stringMap, err := yaml.Parser().Unmarshal([]byte(yamlFile))
	if err != nil {
		return nil, fmt.Errorf("failed to parse default collector config in opamp server: %v", err)
	}
	agentConf := confmap.NewFromStringMap(stringMap)
	parser := NewConfigParser(agentConf)
	return &parser, err
}

func toMap(i interface{}) map[string]interface{} {
	return i.(map[string]interface{})
}

func toList(i interface{}) []interface{} {
	return i.([]interface{})
}

// sent when key is not found in config
func emptyMap() map[string]interface{} {
	return map[string]interface{}{}
}

func emptyList() []interface{} {
	return []interface{}{}
}

func (cp *ConfigParser) Current() *confmap.Conf {
	return cp.agentConf
}

func (cp *ConfigParser) Service() map[string]interface{} {
	service := cp.agentConf.Get(serviceKey)
	if service == nil {
		return emptyMap()
	}
	return toMap(service)
}

// components gets the high level parts like receivers, exporters, processors etc
func (cp *ConfigParser) components(partName string) map[string]interface{} {
	parts := cp.agentConf.Get(partName)
	if parts == nil {
		return emptyMap()
	}

	parsedParts := toMap(parts)

	return parsedParts
}

// components gets the high level parts like receivers, exporters, processors etc
func (cp *ConfigParser) component(partName, name string) (interface{}, error) {
	components := cp.components(partName)
	if p, ok := components[name]; ok {
		return p, nil
	}

	return nil, fmt.Errorf("component not found")
}

func (cp *ConfigParser) Processors() map[string]interface{} {
	return cp.components(processorsKey)
}

func (cp *ConfigParser) Exporters() map[string]interface{} {
	return cp.components(exportersKey)
}

func (cp *ConfigParser) Receivers() map[string]interface{} {
	return cp.components(receiversKey)
}

func (cp *ConfigParser) Exporter(name string) (interface{}, error) {
	return cp.component(exportersKey, name)
}
func (cp *ConfigParser) Receiver(name string) (interface{}, error) {
	return cp.component(receiversKey, name)
}

func (cp *ConfigParser) Processor(name string) (interface{}, error) {
	return cp.component(processorsKey, name)
}

func (cp *ConfigParser) Pipelines(nameOptional string) map[string]interface{} {
	services := cp.Service()
	if p, ok := services[pipelinesKey]; ok {
		pipelines := toMap(p)
		if nameOptional != "" {
			if namedPipeline, ok := pipelines[nameOptional]; ok {
				return toMap(namedPipeline)
			} else {
				return emptyMap()
			}

		}
		return pipelines
	}
	return emptyMap()
}

// component can be "recevers", "exporter" or processors
func (cp *ConfigParser) PipelineComponent(pipelineName, pipelineComponent string) []interface{} {
	pipeline := cp.Pipelines(pipelineName)
	if exporters, ok := pipeline[pipelineComponent]; ok {
		exporters := toList(exporters)
		return exporters
	}
	return emptyList()
}

func (cp *ConfigParser) PipelineExporters(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, exportersKey)
}

func (cp *ConfigParser) PipelineReceivers(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, receiversKey)
}

func (cp *ConfigParser) PipelineProcessors(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, processorsKey)
}

func (cp *ConfigParser) CheckPipelineExists(name string) bool {
	if name == "" {
		return false
	}
	pipelines := cp.Pipelines(name)
	return len(pipelines) > 0
}

// CheckEntryInPipeline lets you look for an entry in pipeline by receiver, processor or exporter name
func (cp *ConfigParser) CheckEntryInPipeline(pipelineName, pipelineComponent, name string) bool {
	if pipelineName == "" || pipelineComponent == "" || name == "" {
		return false
	}

	list := cp.PipelineComponent(pipelineName, pipelineComponent)
	var found bool
	for _, item := range list {
		if item == name {
			found = true
		}
	}

	return found
}

func (cp *ConfigParser) CheckExporterInPipeline(pipelineName, name string) bool {
	return cp.CheckEntryInPipeline(pipelineName, exportersKey, name)
}

func (cp *ConfigParser) CheckProcessorInPipeline(pipelineName, name string) bool {
	return cp.CheckEntryInPipeline(pipelineName, processorsKey, name)
}

func (cp *ConfigParser) CheckRecevierInPipeline(pipelineName, name string) bool {
	return cp.CheckEntryInPipeline(pipelineName, receiversKey, name)
}

func (cp *ConfigParser) Merge(c *confmap.Conf) {
	cp.lock.Lock()
	defer cp.lock.Unlock()
	cp.agentConf.Merge(c)
}

func (cp *ConfigParser) UpdateProcessors(processors map[string]interface{}) {
	updates := cp.Processors()

	for key, params := range processors {
		updates[key] = params
	}

	updatedProcessors := map[string]interface{}{
		processorsKey: updates,
	}

	updatedProcessorConf := confmap.NewFromStringMap(updatedProcessors)

	cp.Merge(updatedProcessorConf)
}

func (cp *ConfigParser) UpdateProcsInPipeline(pipelineName string, list []interface{}) {

	serviceConf := map[string]interface{}{
		serviceKey: map[string]interface{}{
			"pipelines": map[string]interface{}{
				pipelineName: map[string]interface{}{
					processorsKey: list,
				},
			},
		},
	}

	cp.Merge(confmap.NewFromStringMap(serviceConf))
}

func (cp *ConfigParser) ReplacePipeline(name string, receivers []interface{}, processors []interface{}, exporters []interface{}) {
	serviceConf := map[string]interface{}{
		serviceKey: map[string]interface{}{
			"pipelines": map[string]interface{}{
				name: map[string]interface{}{
					receiversKey:  receivers,
					processorsKey: processors,
					exportersKey:  exporters,
				},
			},
		},
	}

	cp.Merge(confmap.NewFromStringMap(serviceConf))
}

func (cp *ConfigParser) replaceComponent(partName, name string, params interface{}) {
	partConf := map[string]interface{}{
		partName: map[string]interface{}{
			name: params,
		},
	}

	cp.Merge(confmap.NewFromStringMap(partConf))
}

func (cp *ConfigParser) ReplaceProcessor(name string, params interface{}) {
	cp.replaceComponent(processorsKey, name, params)
}

func (cp *ConfigParser) ReplaceExporter(name string, params interface{}) {
	cp.replaceComponent(exportersKey, name, params)
}

func (cp *ConfigParser) ReplaceReceiver(name string, params interface{}) {
	cp.replaceComponent(receiversKey, name, params)
}
