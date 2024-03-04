package components

import (
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awss3exporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/carbonexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/fileexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerthrifthttpexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/kafkaexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/opencensusexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/parquetexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusremotewriteexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/pulsarexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/zipkinexporter"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/basicauthextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/bearertokenauthextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/httpforwarder"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/jaegerremotesampling"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/oauth2clientauthextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/dockerobserver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/ecsobserver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/ecstaskobserver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/hostobserver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/k8sobserver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/oidcauthextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/pprofextension"
	"github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/attributesprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/cumulativetodeltaprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/deltatorateprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbyattrsprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbytraceprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/logstransformprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricsgenerationprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/probabilisticsamplerprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/redactionprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourceprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/schemaprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/servicegraphprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanmetricsprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/transformprocessor"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/apachereceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscloudwatchmetricsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscloudwatchreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscontainerinsightreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsecscontainermetricsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsfirehosereceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsxrayreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azureblobreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azureeventhubreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azuremonitorreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/carbonreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/collectdreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/couchdbreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dockerstatsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dotnetdiagnosticsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/elasticsearchreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/filelogreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/fluentforwardreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/hostmetricsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/httpcheckreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jaegerreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jmxreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/journaldreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8sclusterreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8sobjectsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kafkametricsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kafkareceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/memcachedreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mongodbatlasreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mongodbreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mysqlreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/nginxreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/opencensusreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/oracledbreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/otlpjsonfilereceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/podmanreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/postgresqlreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusexecreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/pulsarreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/rabbitmqreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/receivercreator"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/redisreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/simpleprometheusreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/skywalkingreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/sqlqueryreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/sqlserverreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/statsdreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/syslogreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/tcplogreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/udplogreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/zipkinreceiver"
	"github.com/open-telemetry/opentelemetry-collector-contrib/receiver/zookeeperreceiver"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/exporter/loggingexporter"
	"go.opentelemetry.io/collector/exporter/otlpexporter"
	"go.opentelemetry.io/collector/exporter/otlphttpexporter"
	"go.opentelemetry.io/collector/extension"
	"go.opentelemetry.io/collector/extension/ballastextension"
	"go.opentelemetry.io/collector/extension/zpagesextension"
	"go.opentelemetry.io/collector/otelcol"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/processor/batchprocessor"
	"go.opentelemetry.io/collector/processor/memorylimiterprocessor"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
	"go.uber.org/multierr"

	"github.com/SigNoz/signoz-otel-collector/exporter/clickhouselogsexporter"
	"github.com/SigNoz/signoz-otel-collector/exporter/clickhousemetricsexporter"
	"github.com/SigNoz/signoz-otel-collector/exporter/clickhousetracesexporter"
	"github.com/SigNoz/signoz-otel-collector/exporter/signozkafkaexporter"
	_ "github.com/SigNoz/signoz-otel-collector/pkg/parser/grok"
	"github.com/SigNoz/signoz-otel-collector/processor/signozspanmetricsprocessor"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztailsampler"
	"github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor"
	"github.com/SigNoz/signoz-otel-collector/receiver/httplogreceiver"
	"github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"
)

func Components() (otelcol.Factories, error) {
	var errs []error
	factories, err := CoreComponents()
	if err != nil {
		return otelcol.Factories{}, err
	}

	var extensions []extension.Factory
	for _, ext := range factories.Extensions {
		extensions = append(extensions, ext)
	}
	factories.Extensions, err = extension.MakeFactoryMap(extensions...)
	if err != nil {
		errs = append(errs, err)
	}

	receivers := []receiver.Factory{
		apachereceiver.NewFactory(),
		awscloudwatchmetricsreceiver.NewFactory(),
		awscloudwatchreceiver.NewFactory(),
		awscontainerinsightreceiver.NewFactory(),
		awsecscontainermetricsreceiver.NewFactory(),
		awsfirehosereceiver.NewFactory(),
		awsxrayreceiver.NewFactory(),
		azureblobreceiver.NewFactory(),
		azureeventhubreceiver.NewFactory(),
		azuremonitorreceiver.NewFactory(),
		carbonreceiver.NewFactory(),
		collectdreceiver.NewFactory(),
		couchdbreceiver.NewFactory(),
		dockerstatsreceiver.NewFactory(),
		dotnetdiagnosticsreceiver.NewFactory(),
		elasticsearchreceiver.NewFactory(),
		filelogreceiver.NewFactory(),
		fluentforwardreceiver.NewFactory(),
		hostmetricsreceiver.NewFactory(),
		httpcheckreceiver.NewFactory(),
		jaegerreceiver.NewFactory(),
		jmxreceiver.NewFactory(),
		journaldreceiver.NewFactory(),
		k8sclusterreceiver.NewFactory(),
		k8seventsreceiver.NewFactory(),
		k8sobjectsreceiver.NewFactory(),
		kafkametricsreceiver.NewFactory(),
		kafkareceiver.NewFactory(),
		kubeletstatsreceiver.NewFactory(),
		memcachedreceiver.NewFactory(),
		mongodbatlasreceiver.NewFactory(),
		mongodbreceiver.NewFactory(),
		mysqlreceiver.NewFactory(),
		nginxreceiver.NewFactory(),
		opencensusreceiver.NewFactory(),
		oracledbreceiver.NewFactory(),
		otlpjsonfilereceiver.NewFactory(),
		podmanreceiver.NewFactory(),
		postgresqlreceiver.NewFactory(),
		prometheusexecreceiver.NewFactory(),
		prometheusreceiver.NewFactory(),
		pulsarreceiver.NewFactory(),
		rabbitmqreceiver.NewFactory(),
		receivercreator.NewFactory(),
		redisreceiver.NewFactory(),
		sqlqueryreceiver.NewFactory(),
		sqlserverreceiver.NewFactory(),
		simpleprometheusreceiver.NewFactory(),
		skywalkingreceiver.NewFactory(),
		statsdreceiver.NewFactory(),
		syslogreceiver.NewFactory(),
		tcplogreceiver.NewFactory(),
		udplogreceiver.NewFactory(),
		zipkinreceiver.NewFactory(),
		zookeeperreceiver.NewFactory(),
		httplogreceiver.NewFactory(),
		signozkafkareceiver.NewFactory(),
	}
	for _, rcv := range factories.Receivers {
		receivers = append(receivers, rcv)
	}
	factories.Receivers, err = receiver.MakeFactoryMap(receivers...)
	if err != nil {
		errs = append(errs, err)
	}

	exporters := []exporter.Factory{
		awss3exporter.NewFactory(),
		carbonexporter.NewFactory(),
		clickhousemetricsexporter.NewFactory(),
		clickhousetracesexporter.NewFactory(),
		clickhouselogsexporter.NewFactory(),
		fileexporter.NewFactory(),
		jaegerexporter.NewFactory(),
		jaegerthrifthttpexporter.NewFactory(),
		kafkaexporter.NewFactory(),
		signozkafkaexporter.NewFactory(),
		loadbalancingexporter.NewFactory(),
		opencensusexporter.NewFactory(),
		parquetexporter.NewFactory(),
		prometheusexporter.NewFactory(),
		prometheusremotewriteexporter.NewFactory(),
		pulsarexporter.NewFactory(),
		zipkinexporter.NewFactory(),
	}
	for _, exp := range factories.Exporters {
		exporters = append(exporters, exp)
	}
	factories.Exporters, err = exporter.MakeFactoryMap(exporters...)
	if err != nil {
		errs = append(errs, err)
	}

	processors := []processor.Factory{
		attributesprocessor.NewFactory(),
		cumulativetodeltaprocessor.NewFactory(),
		deltatorateprocessor.NewFactory(),
		filterprocessor.NewFactory(),
		groupbyattrsprocessor.NewFactory(),
		groupbytraceprocessor.NewFactory(),
		k8sattributesprocessor.NewFactory(),
		metricsgenerationprocessor.NewFactory(),
		metricstransformprocessor.NewFactory(),
		probabilisticsamplerprocessor.NewFactory(),
		redactionprocessor.NewFactory(),
		resourcedetectionprocessor.NewFactory(),
		resourceprocessor.NewFactory(),
		routingprocessor.NewFactory(),
		schemaprocessor.NewFactory(),
		servicegraphprocessor.NewFactory(),
		signozspanmetricsprocessor.NewFactory(),
		spanmetricsprocessor.NewFactory(),
		spanprocessor.NewFactory(),
		tailsamplingprocessor.NewFactory(),
		transformprocessor.NewFactory(),
		logstransformprocessor.NewFactory(),
		signoztailsampler.NewFactory(),
		signoztransformprocessor.NewFactory(),
	}
	for _, pr := range factories.Processors {
		processors = append(processors, pr)
	}
	factories.Processors, err = processor.MakeFactoryMap(processors...)
	if err != nil {
		errs = append(errs, err)
	}

	return factories, multierr.Combine(errs...)
}

func CoreComponents() (
	otelcol.Factories,
	error,
) {
	var errs error

	extensions, err := extension.MakeFactoryMap(
		ballastextension.NewFactory(),
		basicauthextension.NewFactory(),
		bearertokenauthextension.NewFactory(),
		dockerobserver.NewFactory(),
		ecsobserver.NewFactory(),
		ecstaskobserver.NewFactory(),
		filestorage.NewFactory(),
		hostobserver.NewFactory(),
		httpforwarder.NewFactory(),
		jaegerremotesampling.NewFactory(),
		k8sobserver.NewFactory(),
		oauth2clientauthextension.NewFactory(),
		oidcauthextension.NewFactory(),
		healthcheckextension.NewFactory(),
		pprofextension.NewFactory(),
		zpagesextension.NewFactory(),
	)
	errs = multierr.Append(errs, err)

	receivers, err := receiver.MakeFactoryMap(
		otlpreceiver.NewFactory(),
	)
	errs = multierr.Append(errs, err)

	exporters, err := exporter.MakeFactoryMap(
		loggingexporter.NewFactory(),
		otlpexporter.NewFactory(),
		otlphttpexporter.NewFactory(),
	)
	errs = multierr.Append(errs, err)

	processors, err := processor.MakeFactoryMap(
		batchprocessor.NewFactory(),
		memorylimiterprocessor.NewFactory(),
	)
	errs = multierr.Append(errs, err)

	factories := otelcol.Factories{
		Extensions: extensions,
		Receivers:  receivers,
		Processors: processors,
		Exporters:  exporters,
	}

	return factories, errs
}
