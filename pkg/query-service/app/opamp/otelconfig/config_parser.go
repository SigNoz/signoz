package otelconfig

import (
	"sync"

	"go.opentelemetry.io/collector/confmap"
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

func (cp *ConfigParser) Service() map[string]interface{} {
	service := cp.agentConf.Get("service")
	if service == nil {
		return emptyMap()
	}
	return toMap(service)
}

// components gets the high level parts like receivers, exporters, processors etc
func (cp *ConfigParser) components(partName, nameOptional string) map[string]interface{} {
	parts := cp.agentConf.Get(partName)
	if parts == nil {
		return emptyMap()
	}

	parsedParts := toMap(parts)
	if nameOptional != "" {
		if p, ok := parsedParts[nameOptional]; ok {
			return p.(map[string]interface{})
		} else {
			return emptyMap()
		}
	}

	return parsedParts
}

func (cp *ConfigParser) Processors() map[string]interface{} {
	return cp.components("processors", "")
}

func (cp *ConfigParser) Processor(name string) map[string]interface{} {
	return cp.components("processors", name)
}

func (cp *ConfigParser) Exporters() map[string]interface{} {
	return cp.components("exporters", "")
}

func (cp *ConfigParser) Exporter(name string) map[string]interface{} {
	return cp.components("exporters", name)
}

func (cp *ConfigParser) Receivers() map[string]interface{} {
	return cp.components("receivers", "")
}

func (cp *ConfigParser) Receiver(name string) map[string]interface{} {
	return cp.components("receivers", name)
}

func (cp *ConfigParser) Pipelines(nameOptional string) map[string]interface{} {
	services := cp.Service()
	if p, ok := services["pipelines"]; ok {
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

// component can be "recevers", "exporter" or "processors"
func (cp *ConfigParser) PipelineComponent(pipelineName, pipelineComponent string) []interface{} {
	pipeline := cp.Pipelines(pipelineName)
	if exporters, ok := pipeline[pipelineComponent]; ok {
		exporters := toList(exporters)
		return exporters
	}
	return emptyList()
}

func (cp *ConfigParser) PipelineExporters(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, "exporters")
}

func (cp *ConfigParser) PipelineReceivers(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, "receivers")
}

func (cp *ConfigParser) PipelineProcessors(pipelineName string) []interface{} {
	return cp.PipelineComponent(pipelineName, "processors")
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
	return cp.CheckEntryInPipeline(pipelineName, "exporters", name)
}

func (cp *ConfigParser) CheckProcessorInPipeline(pipelineName, name string) bool {
	return cp.CheckEntryInPipeline(pipelineName, "processors", name)
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
		"processors": updates,
	}

	updatedProcessorConf := confmap.NewFromStringMap(updatedProcessors)

	cp.Merge(updatedProcessorConf)
}

func (cp *ConfigParser) UpdateProcsInPipeline(pipelineName string, list []interface{}) {

	serviceConf := map[string]interface{}{
		"service": map[string]interface{}{
			"pipelines": map[string]interface{}{
				pipelineName: map[string]interface{}{
					"processors": list,
				},
			},
		},
	}

	cp.Merge(confmap.NewFromStringMap(serviceConf))
}
