package collectorsimulator

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// Simulate processing of logs through the otel collector.
// Useful for testing, validation and generating previews.
func SimulateLogsProcessing(
	ctx context.Context,
	processorFactories map[component.Type]processor.Factory,
	configGenerator ConfigGenerator,
	logs []plog.Logs,
	timeout time.Duration,
) (
	outputLogs []plog.Logs, collectorErrs []string, apiErr *model.ApiError,
) {
	// Construct and start a simulator (wraps a collector service)
	simulator, simulatorInitCleanup, apiErr := NewCollectorSimulator(
		ctx, processorFactories, configGenerator,
	)
	if simulatorInitCleanup != nil {
		defer simulatorInitCleanup()
	}
	if apiErr != nil {
		return nil, nil, model.WrapApiError(apiErr, "could not create logs processing simulator")
	}

	simulatorCleanup, apiErr := simulator.Start(ctx)
	// We can not rely on collector service to shutdown successfully and cleanup refs to inmemory components.
	if simulatorCleanup != nil {
		defer simulatorCleanup()
	}
	if apiErr != nil {
		return nil, nil, apiErr
	}

	// Do the simulation
	for _, plog := range logs {
		apiErr = SendLogsToSimulator(ctx, simulator, plog)
		if apiErr != nil {
			return nil, nil, model.WrapApiError(apiErr, "could not consume logs for simulation")
		}
	}

	result, apiErr := GetProcessedLogsFromSimulator(
		simulator, len(logs), timeout,
	)
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

	for _, log := range simulationErrs {
		// if log is empty or log comes from featuregate.go, then remove it
		if log == "" || strings.Contains(log, "featuregate.go") {
			continue
		}
		collectorErrs = append(collectorErrs, log)
	}

	return result, collectorErrs, nil
}

func SendLogsToSimulator(
	ctx context.Context,
	simulator *CollectorSimulator,
	plog plog.Logs,
) *model.ApiError {
	receiver := simulator.GetReceiver()
	if receiver == nil {
		return model.InternalError(fmt.Errorf("could not find in memory receiver for simulator"))
	}
	if err := receiver.ConsumeLogs(ctx, plog); err != nil {
		return model.InternalError(errors.Wrap(err,
			"inmemory receiver could not consume logs for simulation",
		))
	}
	return nil
}

func GetProcessedLogsFromSimulator(
	simulator *CollectorSimulator,
	minLogCount int,
	timeout time.Duration,
) (
	[]plog.Logs, *model.ApiError,
) {
	exporter := simulator.GetExporter()
	if exporter == nil {
		return nil, model.InternalError(fmt.Errorf("could not find in memory exporter for simulator"))
	}

	// Must do a time based wait to ensure all logs come through.
	// For example, logstransformprocessor does internal batching and it
	// takes (processorCount * batchTime) for logs to get through.
	startTsMillis := time.Now().UnixMilli()
	for {
		elapsedMillis := time.Now().UnixMilli() - startTsMillis
		if elapsedMillis > timeout.Milliseconds() {
			break
		}

		exportedLogs := exporter.GetLogs()
		if len(exportedLogs) >= minLogCount {
			return exportedLogs, nil
		}

		time.Sleep(50 * time.Millisecond)
	}

	return exporter.GetLogs(), nil
}
