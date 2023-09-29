package collectorsimulator

import (
	"context"
	"fmt"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/google/uuid"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/logstransformprocessor"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/confmap/provider/yamlprovider"
	"go.opentelemetry.io/collector/connector"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/extension"
	"go.opentelemetry.io/collector/otelcol"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/service"

	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline/collectorsimulator/inmemoryexporter"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline/collectorsimulator/inmemoryreceiver"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type SignozLog model.GetLogsResponse

type CollectorConfGeneratorFn func(baseConfYaml []byte) ([]byte, *model.ApiError)

func SimulateLogsProcessing(ctx context.Context, generateConfig CollectorConfGeneratorFn, logs []plog.Logs) (
	[]plog.Logs, *model.ApiError,
) {
	// Factories for components usable in the simulation
	receiverFactories, err := receiver.MakeFactoryMap(inmemoryreceiver.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create receiver factories."))
	}
	processorFactories, err := processor.MakeFactoryMap(logstransformprocessor.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create processor factories."))
	}
	exporterFactories, err := exporter.MakeFactoryMap(inmemoryexporter.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create processor factories."))
	}
	factories := otelcol.Factories{
		Receivers:  receiverFactories,
		Processors: processorFactories,
		Exporters:  exporterFactories,
	}

	// Prepare collector conf yaml for simulation
	receiverId := uuid.NewString()
	exporterId := uuid.NewString()
	baseConf := makeBaseConfig(receiverId, exporterId)

	spew.Printf("\nbaseconf:\n%v\n", string(baseConf))

	collectorConfYaml, apiErr := generateConfig([]byte(baseConf))
	if err != nil {
		return nil, model.WrapApiError(apiErr, "could not generate collector config")
	}

	spew.Printf("\ngenerated collector conf:\n%v\n", string(collectorConfYaml))

	// Parse and validate collector conf
	yamlP := yamlprovider.New()
	confProvider, err := otelcol.NewConfigProvider(otelcol.ConfigProviderSettings{
		ResolverSettings: confmap.ResolverSettings{
			URIs:      []string{"yaml:" + string(collectorConfYaml)},
			Providers: map[string]confmap.Provider{yamlP.Scheme(): yamlP},
		},
	})
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not create config provider."))
	}

	collectorCfg, err := confProvider.Get(ctx, factories)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "failed to parse collector config"))
	}
	if err = collectorCfg.Validate(); err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "invalid collector config"))
	}

	// Build and start collector service.

	svcSettings := service.Settings{
		Receivers:  receiver.NewBuilder(collectorCfg.Receivers, factories.Receivers),
		Processors: processor.NewBuilder(collectorCfg.Processors, factories.Processors),
		Exporters:  exporter.NewBuilder(collectorCfg.Exporters, factories.Exporters),
		Connectors: connector.NewBuilder(collectorCfg.Connectors, factories.Connectors),
		Extensions: extension.NewBuilder(collectorCfg.Extensions, factories.Extensions),
	}
	collectorSvc, err := service.New(ctx, svcSettings, collectorCfg.Service)

	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not instantiate collector service"))
	}
	if err = collectorSvc.Start(ctx); err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not start collector service."))
	}

	// Do the simulation
	receiver := inmemoryreceiver.GetReceiverInstance(receiverId)
	if receiver == nil {
		return nil, model.InternalError(fmt.Errorf("could not find in memory receiver"))
	}
	for _, plog := range logs {
		receiver.ConsumeLogs(ctx, plog)
	}

	time.Sleep(500 * time.Millisecond)

	//startTs := time.Now().Unix()
	//for {
	//	if time.Now().Unix()-startTs > 1 {
	//		break
	//	}
	//	exportedLogs := exporter.(*inmemoryexporter.InMemoryExporter).GetLogs()
	//	if len(exportedLogs) > 0 {
	//		break
	//	}
	//	time.Sleep(10 * time.Millisecond)
	//}

	exporter := inmemoryexporter.GetExporterInstance(exporterId)
	if exporter == nil {
		return nil, model.InternalError(fmt.Errorf("could not find in memory exporter"))
	}
	result := exporter.GetLogs()

	// Shut down the collector service.
	if err := collectorSvc.Shutdown(ctx); err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not shutdown the collector service"))
	}

	return result, nil
}

func makeBaseConfig(receiverId string, exporterId string) string {
	return fmt.Sprintf(`
receivers:
  memory:
    id: %s
exporters:
  memory:
    id: %s
service:
  pipelines:
    logs:
      receivers:
        - memory
      exporters:
        - memory
  telemetry:
    metrics:
      level: none
`, receiverId, exporterId)
}
