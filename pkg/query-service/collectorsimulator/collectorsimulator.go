package collectorsimulator

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/component"
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

	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryexporter"
	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryreceiver"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type SignozLog model.GetLogsResponse

type ProcessorConfig struct {
	Name   string
	Config map[string]interface{}
}

func SimulateLogsProcessing(
	ctx context.Context,
	processorFactories map[component.Type]processor.Factory,
	processorConfigs []ProcessorConfig,
	logs []plog.Logs,
	timeout time.Duration,
) (
	[]plog.Logs, *model.ApiError,
) {
	// Factories for components usable in the simulation
	receiverFactories, err := receiver.MakeFactoryMap(inmemoryreceiver.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create receiver factories."))
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

	collectorConfYaml, err := generateSimulationConfig(
		receiverId, processorConfigs, exporterId,
	)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not generate collector config"))
	}

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

	exporter := inmemoryexporter.GetExporterInstance(exporterId)
	if exporter == nil {
		return nil, model.InternalError(fmt.Errorf("could not find in memory exporter"))
	}

	startTs := time.Now().UnixMilli()
	for {
		if time.Now().UnixMilli()-startTs > timeout.Milliseconds() {
			break
		}
		exportedLogs := exporter.GetLogs()
		if len(exportedLogs) > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	result := exporter.GetLogs()

	// Shut down the collector service.
	if err := collectorSvc.Shutdown(ctx); err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not shutdown the collector service"))
	}

	return result, nil
}

func generateSimulationConfig(
	receiverId string,
	processorConfigs []ProcessorConfig,
	exporterId string,
) ([]byte, error) {
	baseConf := fmt.Sprintf(`
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

	simulationConf, err := yaml.Parser().Unmarshal([]byte(baseConf))
	if err != nil {
		return nil, err
	}

	processors := map[string]interface{}{}
	procNamesInOrder := []string{}
	for _, processorConf := range processorConfigs {
		processors[processorConf.Name] = processorConf.Config
		procNamesInOrder = append(procNamesInOrder, processorConf.Name)
	}
	simulationConf["processors"] = processors

	svc := simulationConf["service"].(map[string]interface{})
	svcPipelines := svc["pipelines"].(map[string]interface{})
	svcPipelinesLogs := svcPipelines["logs"].(map[string]interface{})
	svcPipelinesLogs["processors"] = procNamesInOrder

	simulationConfYaml, err := yaml.Parser().Marshal(simulationConf)
	if err != nil {
		return nil, err
	}

	return simulationConfYaml, nil
}
