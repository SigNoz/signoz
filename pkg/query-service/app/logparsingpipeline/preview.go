package logparsingpipeline

import (
	"time"

	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline/collectorsimulator"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// TODO(Raj): See if there is a more suitable Log struct
type SignozLog model.GetLogsResponse

func SimulatePipelinesProcessing(
	pipelines []Pipeline,
	logs []SignozLog,
) ([]SignozLog, *model.ApiError) {
	if len(pipelines) < 1 {
		return logs, nil
	}

	processors, procNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(
			err, "could not prepare otel processors for pipelines",
		))
	}

	collectorConfGenerator := func(
		baseConfYaml []byte,
	) ([]byte, error) {
		return opamp.GenerateCollectorConfigWithPipelines(
			baseConfYaml, processors, procNames,
		)
	}

	plogs := toPlogs(logs)

	resultPlogs, apiErr := collectorsimulator.SimulateLogsProcessing(
		collectorConfGenerator, plogs,
	)
	if apiErr != nil {
		return nil, apiErr
	}

	siglogs := toSignozLogs(resultPlogs)

	return siglogs, nil
}

func toPlogs(logs []SignozLog) []plog.Logs {
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

		var spanIdBuf [8]byte
		copy(spanIdBuf[:], []byte(log.SpanID))
		slRecord.SetSpanID(spanIdBuf)

		var traceIdBuf [16]byte
		copy(traceIdBuf[:], []byte(log.TraceID))
		slRecord.SetTraceID(traceIdBuf)

		slRecord.SetSeverityText(log.SeverityText)
		slRecord.SetSeverityNumber(plog.SeverityNumber(log.SeverityNumber))

		slRecord.Body().SetStr(log.Body)

		slAttribs := slRecord.Attributes()
		for k, v := range log.Attributes_string {
			slAttribs.PutStr(k, v)
		}
		for k, v := range log.Attributes_int64 {
			slAttribs.PutInt(k, v)
		}
		for k, v := range log.Attributes_float64 {
			slAttribs.PutDouble(k, v)
		}

		result = append(result, pl)
	}

	return result
}

func toSignozLogs(plogs []plog.Logs) []SignozLog {
	result := []SignozLog{}

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

					signozLog := SignozLog{
						Timestamp:          uint64(lr.Timestamp()),
						TraceID:            lr.TraceID().String(),
						SpanID:             lr.SpanID().String(),
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
