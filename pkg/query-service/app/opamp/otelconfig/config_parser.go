package otelconfig

import (
	"sync"

	"go.opentelemetry.io/collector/confmap"
)

type ConfigPart map[string]interface{}

type ConfigList []interface{}

type ConfigParser struct {
	lock      sync.Mutex
	agentConf *confmap.Conf
}

func NewConfigParser(agentConf *confmap.Conf) ConfigParser {
	return ConfigParser{
		agentConf: agentConf,
	}
}

func (cp *ConfigParser) Service() ConfigPart {
	service := cp.agentConf.Get("service")
	if service == nil {
		return ConfigPart{}
	}
	return service.(ConfigPart)
}

// components gets the high level parts like receivers, exporters, processors etc
func (cp *ConfigParser) components(partName, nameOptional string) ConfigPart {
	parts := cp.agentConf.Get(partName)
	if parts == nil {
		return ConfigPart{}
	}

	parsedParts := parts.(ConfigPart)
	if nameOptional != "" {
		if p, ok := parsedParts[nameOptional]; ok {
			return p.(ConfigPart)
		} else {
			return ConfigPart{}
		}
	}

	return parsedParts
}

func (cp *ConfigParser) Processors() ConfigPart {
	return cp.components("processors", "")
}

func (cp *ConfigParser) Processor(name string) ConfigPart {
	return cp.components("processors", name)
}

func (cp *ConfigParser) Exporters() ConfigPart {
	return cp.components("exporters", "")
}

func (cp *ConfigParser) Exporter(name string) ConfigPart {
	return cp.components("exporters", name)
}

func (cp *ConfigParser) Receivers() ConfigPart {
	return cp.components("receivers", "")
}

func (cp *ConfigParser) Receiver(name string) ConfigPart {
	return cp.components("receivers", name)
}

func (cp *ConfigParser) Pipelines(nameOptional string) ConfigPart {
	services := cp.Service()
	if p, ok := services["pipelines"]; ok {
		pipelines := p.(ConfigPart)
		if nameOptional != "" {
			if namedPipeline, ok := pipelines[nameOptional]; ok {
				return namedPipeline.(ConfigPart)
			} else {
				return ConfigPart{}
			}

		}
		return pipelines
	}
	return ConfigPart{}
}

// component can be "recevers", "exporter" or "processors"
func (cp *ConfigParser) PipelineComponent(pipelineName, pipelineComponent string) ConfigList {
	pipeline := cp.Pipelines(pipelineName)
	if exporters, ok := pipeline[pipelineComponent]; ok {
		exporters := exporters.(ConfigList)
		return exporters
	}
	return ConfigList{}
}

func (cp *ConfigParser) PipelineExporters(pipelineName string) ConfigList {
	return cp.PipelineComponent(pipelineName, "exporters")
}

func (cp *ConfigParser) PipelineReceivers(pipelineName string) ConfigList {
	return cp.PipelineComponent(pipelineName, "receivers")
}

func (cp *ConfigParser) PipelineProcessors(pipelineName string) ConfigList {
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

func (cp *ConfigParser) UpdateProcessors(processors ConfigPart) {
	updates := cp.Processors()

	for key, params := range processors {
		updates[key] = params
	}

	updatedProcessors := ConfigPart{
		"processors": updates,
	}

	updatedProcessorConf := confmap.NewFromStringMap(updatedProcessors)

	cp.Merge(updatedProcessorConf)
}

func (cp *ConfigParser) UpdateProcsInPipeline(pipelineName string, list ConfigList) {

	serviceConf := ConfigPart{
		"service": ConfigPart{
			"pipelines": ConfigPart{
				pipelineName: ConfigPart{
					"processors": list,
				},
			},
		},
	}

	cp.Merge(confmap.NewFromStringMap(serviceConf))
}
