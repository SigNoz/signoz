package opamp

import (
	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/lbexporter"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/otlpworker"
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
func makeLbExporterSpec(agentConf *confmap.Conf) error {

	configParser := otelconfig.NewConfigParser(agentConf)

	if configParser.CheckPipelineExists(LoadBalancerPipeline) {
		return nil
	}

	receivers := configParser.PipelineReceivers(TracesDefaultPipeline)
	processors := configParser.PipelineProcessors(TracesDefaultPipeline)
	exporters := configParser.PipelineExporters(TracesDefaultPipeline)

	// alter pipelines
	configParser.ReplacePipeline(LoadBalancerPipeline, receivers, otelconfig.StringsToIfaces([]string{}), otelconfig.StringsToIfaces([]string{LoadBalancerExporter}))
	configParser.ReplacePipeline(TracesDefaultPipeline, otelconfig.StringsToIfaces([]string{OTLPWorker}), processors, exporters)

	// add otlp internal receiver
	configParser.ReplaceReceiver(OTLPWorker, otlpworker.NewOtlpWorkerReceiver("0.0.0.0:4949"))

	// add lb exporter
	configParser.ReplaceExporter(LoadBalancerExporter, lbexporter.NewDnsConfig("amol-signoz-otel-collector-worker", "4949"))
	return nil
}
