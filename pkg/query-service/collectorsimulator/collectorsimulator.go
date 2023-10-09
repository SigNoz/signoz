package collectorsimulator

import (
	"bytes"
	"context"
	"fmt"
	"strings"

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
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/service"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryexporter"
	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryreceiver"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// Puts together a collector service with inmemory receiver and exporter
// for simulating processing of signal data through an otel collector
type CollectorSimulator struct {
	// collector service to be used for the simulation
	collectorSvc *service.Service

	// Buffer where collectorSvc will log errors.
	collectorErrorLogsBuffer *bytes.Buffer

	// error channel where collector components will report fatal errors
	// Gets passed in as AsyncErrorChannel in service.Settings when creating a collector service.
	collectorErrorChannel chan error

	// Unique ids of inmemory receiver and exporter instances that
	// will be created by collectorSvc
	inMemoryReceiverId string
	inMemoryExporterId string
}

func NewCollectorSimulator(
	ctx context.Context,
	signalType component.DataType,
	processorFactories map[component.Type]processor.Factory,
	processorConfigs []ProcessorConfig,
) (*CollectorSimulator, *model.ApiError) {
	// Put together collector component factories for use in the simulation
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

	// Prepare collector config yaml for simulation
	inMemoryReceiverId := uuid.NewString()
	inMemoryExporterId := uuid.NewString()

	collectorConfYaml, err := generateSimulationConfig(
		signalType, inMemoryReceiverId, processorConfigs, inMemoryExporterId,
	)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not generate collector config"))
	}

	// Parse and validate collector config
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
	collectorErrChan := make(chan error)
	var collectorErrBuf bytes.Buffer
	svcSettings := service.Settings{
		Receivers:         receiver.NewBuilder(collectorCfg.Receivers, factories.Receivers),
		Processors:        processor.NewBuilder(collectorCfg.Processors, factories.Processors),
		Exporters:         exporter.NewBuilder(collectorCfg.Exporters, factories.Exporters),
		Connectors:        connector.NewBuilder(collectorCfg.Connectors, factories.Connectors),
		Extensions:        extension.NewBuilder(collectorCfg.Extensions, factories.Extensions),
		AsyncErrorChannel: collectorErrChan,
		LoggingOptions: []zap.Option{
			zap.ErrorOutput(zapcore.AddSync(&collectorErrBuf)),
		},
	}

	collectorSvc, err := service.New(ctx, svcSettings, collectorCfg.Service)
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not instantiate collector service"))
	}

	return &CollectorSimulator{
		inMemoryReceiverId:       inMemoryReceiverId,
		inMemoryExporterId:       inMemoryExporterId,
		collectorSvc:             collectorSvc,
		collectorErrorLogsBuffer: &collectorErrBuf,
		collectorErrorChannel:    collectorErrChan,
	}, nil
}

func (l *CollectorSimulator) Start(ctx context.Context) (
	func(), *model.ApiError,
) {
	// Calling collectorSvc.Start below will in turn call Start on
	// inmemory receiver and exporter instances created by collectorSvc
	//
	// inmemory components are indexed in a global map after Start is called
	// on them and will have to be cleaned up to ensure there is no memory leak
	cleanupFn := func() {
		inmemoryreceiver.CleanupInstance(l.inMemoryReceiverId)
		inmemoryexporter.CleanupInstance(l.inMemoryExporterId)
	}

	err := l.collectorSvc.Start(ctx)
	if err != nil {
		return cleanupFn, model.InternalError(errors.Wrap(err, "could not start collector service for simulation"))
	}

	return cleanupFn, nil
}

func (l *CollectorSimulator) GetReceiver() *inmemoryreceiver.InMemoryReceiver {
	return inmemoryreceiver.GetReceiverInstance(l.inMemoryReceiverId)
}

func (l *CollectorSimulator) GetExporter() *inmemoryexporter.InMemoryExporter {
	return inmemoryexporter.GetExporterInstance(l.inMemoryExporterId)
}

func (l *CollectorSimulator) Shutdown(ctx context.Context) (
	simulationErrs []string, apiErr *model.ApiError,
) {
	shutdownErr := l.collectorSvc.Shutdown(ctx)

	// Collect all errors logged or reported by collectorSvc
	simulationErrs = []string{}
	close(l.collectorErrorChannel)
	for reportedErr := range l.collectorErrorChannel {
		simulationErrs = append(simulationErrs, reportedErr.Error())
	}

	if l.collectorErrorLogsBuffer.Len() > 0 {
		errBufText := strings.TrimSpace(l.collectorErrorLogsBuffer.String())
		errBufLines := strings.Split(errBufText, "\n")
		simulationErrs = append(simulationErrs, errBufLines...)
	}

	if shutdownErr != nil {
		return simulationErrs, model.InternalError(errors.Wrap(
			shutdownErr, "could not shutdown the collector service",
		))
	}
	return simulationErrs, nil
}

func generateSimulationConfig(
	signalType component.DataType,
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
      telemetry:
        metrics:
          level: none
        logs:
          level: error
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
	svc["pipelines"] = map[string]interface{}{
		string(signalType): map[string]interface{}{
			"receivers":  []string{"memory"},
			"processors": procNamesInOrder,
			"exporters":  []string{"memory"},
		},
	}

	simulationConfYaml, err := yaml.Parser().Marshal(simulationConf)
	if err != nil {
		return nil, err
	}

	return simulationConfYaml, nil
}
