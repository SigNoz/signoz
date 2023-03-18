package opamp

import (
	"fmt"

	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig"
)

const (
	LoadBalancerPipeline  = "traces/lb"
	LoadBalancerExporter  = "loadbalancing"
	TracesDefaultPipeline = "traces"
	OTLPWorker            = "otlp/worker"
)

//
// makeLbExporterSpec adds a new pipeline for
// enabling LB exporter and adding OTLP worker on the same
// instance
//  traces/lb:
// 		receivers: [otlp, jaeger]
// 		processors: []
// 		exporters: [lbExporter]

// update receiver in service > pipelines > traces
// traces:
//
//	receivers: [otlp_internal]
//	processors: [signoz_tail_sampling, batch]
//	exporters: [clickhousetraceexporter]
func makeLbExporterSpec(agentConf *confmap.Conf, defaultConf *otelconfig.ConfigParser) error {

	configParser := otelconfig.NewConfigParser(agentConf)

	if configParser.CheckPipelineExists(LoadBalancerPipeline) {
		return nil
	}

	if defaultConf == nil {
		return fmt.Errorf("opamp requires a default config to setup LB Exporter")
	}

	receivers := configParser.PipelineReceivers(TracesDefaultPipeline)
	processors := configParser.PipelineProcessors(TracesDefaultPipeline)
	exporters := configParser.PipelineExporters(TracesDefaultPipeline)

	// alter pipelines
	configParser.ReplacePipeline(LoadBalancerPipeline, receivers, otelconfig.StringsToIfaces([]string{}), otelconfig.StringsToIfaces([]string{LoadBalancerExporter}))
	configParser.ReplacePipeline(TracesDefaultPipeline, otelconfig.StringsToIfaces([]string{OTLPWorker}), processors, exporters)

	// fetch otlp worker params from default otel config in opamp server
	recevierConfig, err := defaultConf.Receiver(OTLPWorker)
	if err != nil || recevierConfig == nil {
		return fmt.Errorf("invalid default otel config found in opamp server: %v", err)
	}

	// add otlp/worker to receivers
	configParser.ReplaceReceiver(OTLPWorker, recevierConfig)

	// fetch lb exporter config from default otel file in opamp server
	exporterConfig, err := defaultConf.Exporter(LoadBalancerExporter)
	if err != nil || exporterConfig == nil {
		return fmt.Errorf("invalid default otel config found in opamp server: %v", err)
	}

	// add loadbalancing to exporters
	configParser.ReplaceExporter(LoadBalancerExporter, exporterConfig)
	return nil
}
