package collectorsimulator

import (
	"context"
	"time"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
	"go.signoz.io/signoz/pkg/query-service/model"
)

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
	outputLogs []plog.Logs, collectorErrs []string, apiErr *model.ApiError,
) {
	// Construct and start a simulator (wraps a collector service)
	simulator, apiErr := NewLogsProcessingSimulator(
		ctx, processorFactories, processorConfigs,
	)
	if apiErr != nil {
		return nil, nil, model.WrapApiError(apiErr, "could not create logs processing simulator")
	}

	simulatorCleanup, apiErr := simulator.Start(ctx)
	// We can not rely on collector service to shutdown successfully and take care of
	// cleaning up inmemory component references and ensure there are no memory leaks
	defer simulatorCleanup()
	if apiErr != nil {
		return nil, nil, apiErr
	}

	// Do the simulation
	for _, plog := range logs {
		if apiErr = simulator.ConsumeLogs(ctx, plog); apiErr != nil {
			return nil, nil, model.WrapApiError(apiErr, "could not consume logs for simulation")
		}
	}

	result, apiErr := simulator.GetProcessedLogs(len(logs), timeout)
	if apiErr != nil {
		return nil, nil, model.InternalError(model.WrapApiError(apiErr,
			"could not get processed logs from simulator",
		))
	}

	// Shut down the simulator
	simulationErrs, apiErr := simulator.Shutdown(ctx)
	if apiErr != nil {
		return nil, simulationErrs, model.WrapApiError(apiErr,
			"could not shutdown logs processing simulator",
		)
	}

	return result, simulationErrs, nil
}
