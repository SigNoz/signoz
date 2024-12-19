package logparsingpipeline

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz-otel-collector/pkg/collectorsimulator"
	_ "github.com/SigNoz/signoz-otel-collector/pkg/parser/grok"
	"github.com/SigNoz/signoz-otel-collector/processor/signozlogspipelineprocessor"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func SimulatePipelinesProcessing(
	ctx context.Context,
	pipelines []Pipeline,
	logs []model.SignozLog,
) (
	output []model.SignozLog, collectorWarnAndErrorLogs []string, apiErr *model.ApiError,
) {

	if len(pipelines) < 1 {
		return logs, nil, nil
	}

	// Collector simulation does not guarantee that logs will come
	// out in the same order as in the input.
	//
	// Add a temp attribute for sorting logs in simulation output
	inputOrderAttribute := "__signoz_input_idx__"
	for i := 0; i < len(logs); i++ {
		if logs[i].Attributes_int64 == nil {
			logs[i].Attributes_int64 = map[string]int64{}
		}
		logs[i].Attributes_int64[inputOrderAttribute] = int64(i)
	}
	simulatorInputPLogs := SignozLogsToPLogs(logs)

	processorFactories, err := processor.MakeFactoryMap(
		signozlogspipelineprocessor.NewFactory(),
	)
	if err != nil {
		return nil, nil, model.InternalError(errors.Wrap(
			err, "could not construct processor factory map",
		))
	}

	// Pipelines translate to logtransformprocessors in otel collector config.
	// Each logtransformprocessor (stanza) does its own batching with a flush
	// interval of 100ms. So e2e processing time for logs grows linearly with
	// the number of logtransformprocessors involved.
	// See defaultFlushInterval at https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/adapter/emitter.go
	// TODO(Raj): Remove this after flushInterval is exposed in logtransformprocessor config
	timeout := time.Millisecond * time.Duration(len(pipelines)*100+100)

	configGenerator := func(baseConf []byte) ([]byte, error) {
		updatedConf, apiErr := GenerateCollectorConfigWithPipelines(baseConf, pipelines)
		if apiErr != nil {
			return nil, apiErr.ToError()
		}
		return updatedConf, nil
	}

	outputPLogs, collectorErrs, simulationErr := collectorsimulator.SimulateLogsProcessing(
		ctx,
		processorFactories,
		configGenerator,
		simulatorInputPLogs,
		timeout,
	)
	if simulationErr != nil {
		if errors.Is(simulationErr, collectorsimulator.ErrInvalidConfig) {
			apiErr = model.BadRequest(simulationErr)
		} else {
			apiErr = model.InternalError(simulationErr)
		}

		return nil, collectorErrs, model.WrapApiError(apiErr,
			"could not simulate log pipelines processing.\nCollector errors",
		)
	}

	outputSignozLogs := PLogsToSignozLogs(outputPLogs)

	// Sort output logs by their order in the input and remove the temp ordering attribute
	sort.Slice(outputSignozLogs, func(i, j int) bool {
		iIdx := outputSignozLogs[i].Attributes_int64[inputOrderAttribute]
		jIdx := outputSignozLogs[j].Attributes_int64[inputOrderAttribute]
		return iIdx < jIdx
	})
	for _, sigLog := range outputSignozLogs {
		delete(sigLog.Attributes_int64, inputOrderAttribute)
	}

	for _, log := range collectorErrs {
		// if log is empty or log comes from featuregate.go, then remove it
		if log == "" || strings.Contains(log, "featuregate.go") {
			continue
		}
		collectorWarnAndErrorLogs = append(collectorWarnAndErrorLogs, log)
	}

	return outputSignozLogs, collectorWarnAndErrorLogs, nil
}

// plog doesn't contain an ID field.
// SignozLog.ID is stored as a log attribute in plogs for processing
// and gets hydrated back later.
const SignozLogIdAttr = "__signoz_log_id__"

func SignozLogsToPLogs(logs []model.SignozLog) []plog.Logs {
	result := []plog.Logs{}

	for _, log := range logs {
		pl := plog.NewLogs()
		rl := pl.ResourceLogs().AppendEmpty()

		resourceAttribs := rl.Resource().Attributes()
		for k, v := range log.Resources_string {
			resourceAttribs.PutStr(k, v)
		}

		scopeLog := rl.ScopeLogs().AppendEmpty()
		slRecord := scopeLog.LogRecords().AppendEmpty()

		slRecord.SetTimestamp(pcommon.NewTimestampFromTime(
			time.Unix(0, int64(log.Timestamp)),
		))

		var traceIdBuf [16]byte
		copy(traceIdBuf[:], []byte(log.TraceID))
		slRecord.SetTraceID(traceIdBuf)

		var spanIdBuf [8]byte
		copy(spanIdBuf[:], []byte(log.SpanID))
		slRecord.SetSpanID(spanIdBuf)

		slRecord.SetFlags(plog.LogRecordFlags(log.TraceFlags))

		slRecord.SetSeverityText(log.SeverityText)
		slRecord.SetSeverityNumber(plog.SeverityNumber(log.SeverityNumber))

		slRecord.Body().SetStr(log.Body)

		slAttribs := slRecord.Attributes()
		for k, v := range log.Attributes_int64 {
			slAttribs.PutInt(k, v)
		}
		for k, v := range log.Attributes_float64 {
			slAttribs.PutDouble(k, v)
		}
		for k, v := range log.Attributes_string {
			slAttribs.PutStr(k, v)
		}
		slAttribs.PutStr(SignozLogIdAttr, log.ID)

		result = append(result, pl)
	}

	return result
}

func PLogsToSignozLogs(plogs []plog.Logs) []model.SignozLog {
	result := []model.SignozLog{}

	for _, pl := range plogs {

		resourceLogsSlice := pl.ResourceLogs()
		for i := 0; i < resourceLogsSlice.Len(); i++ {
			rl := resourceLogsSlice.At(i)

			scopeLogsSlice := rl.ScopeLogs()
			for j := 0; j < scopeLogsSlice.Len(); j++ {
				sl := scopeLogsSlice.At(j)

				lrSlice := sl.LogRecords()
				for k := 0; k < lrSlice.Len(); k++ {
					lr := lrSlice.At(k)

					// Recover ID for the log and remove temp attrib used for storing it
					signozLogId := ""
					logIdVal, exists := lr.Attributes().Get(SignozLogIdAttr)
					if exists {
						signozLogId = logIdVal.Str()
					}
					lr.Attributes().Remove(SignozLogIdAttr)

					signozLog := model.SignozLog{
						Timestamp:          uint64(lr.Timestamp()),
						ID:                 signozLogId,
						TraceID:            lr.TraceID().String(),
						SpanID:             lr.SpanID().String(),
						TraceFlags:         uint32(lr.Flags()),
						SeverityText:       lr.SeverityText(),
						SeverityNumber:     uint8(lr.SeverityNumber()),
						Body:               lr.Body().AsString(),
						Resources_string:   pMapToStrMap(rl.Resource().Attributes()),
						Attributes_string:  map[string]string{},
						Attributes_int64:   map[string]int64{},
						Attributes_float64: map[string]float64{},
					}

					// Populate signozLog.Attributes_...
					lr.Attributes().Range(func(k string, v pcommon.Value) bool {
						if v.Type() == pcommon.ValueTypeDouble {
							signozLog.Attributes_float64[k] = v.Double()
						} else if v.Type() == pcommon.ValueTypeInt {
							signozLog.Attributes_int64[k] = v.Int()
						} else {
							signozLog.Attributes_string[k] = v.AsString()
						}
						return true
					})

					result = append(result, signozLog)
				}
			}
		}
	}

	return result
}

func pMapToStrMap(pMap pcommon.Map) map[string]string {
	result := map[string]string{}
	pMap.Range(func(k string, v pcommon.Value) bool {
		result[k] = v.AsString()
		return true
	})
	return result
}
