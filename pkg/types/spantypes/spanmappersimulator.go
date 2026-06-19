package spantypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

var (
	ErrCodeProcessorFactoryMapFailed  = errors.MustNewCode("processor_factory_map_failed")
	ErrCodeSpanMapperSimulationFailed = errors.MustNewCode("span_mapper_simulation_failed")
)

// spanInputOrderAttr tags each input span with its index so the simulator
// output can be sorted back into input order. The collector simulator does
// not guarantee that traces come out in the order they went in.
const spanInputOrderAttr = "__signoz_input_idx__"

// SimulateSpanMappersProcessing runs the given spans through an in-memory
// collector pipeline that hosts signozspanmapperprocessor configured by the
// supplied groups, and returns the transformed spans. Mirrors
// SimulatePipelinesProcessing in pkg/query-service/app/logparsingpipeline.
// func SimulateSpanMappersProcessing(
// 	ctx context.Context,
// 	groups []*SpanMapperGroupWithMappers,
// 	spans []SpanMapperTestSpan,
// ) (
// 	[]SpanMapperTestSpan, []string, error,
// ) {
// 	enabled := filterEnabledGroupsWithMappers(groups)
// 	if len(enabled) < 1 {
// 		return spans, nil, nil
// 	}

// 	for i := range spans {
// 		if spans[i].Attributes == nil {
// 			spans[i].Attributes = map[string]any{}
// 		}
// 		spans[i].Attributes[spanInputOrderAttr] = int64(i)
// 	}
// 	simulatorInput := SpansToPTraces(spans)

// 	processorFactories, err := otelcol.MakeFactoryMap(signozspanmapperprocessor.NewFactory())
// 	if err != nil {
// 		return nil, nil, errors.WrapInternalf(err, ErrCodeProcessorFactoryMapFailed, "could not construct processor factory map")
// 	}

// 	configGenerator := func(baseConf []byte) ([]byte, error) {
// 		return GenerateCollectorConfigWithSpanMapperProcessor(baseConf, enabled)
// 	}

// 	// signozspanmapperprocessor does no batching; spans flow through immediately.
// 	timeout := 200 * time.Millisecond

// 	outputTraces, collectorErrs, simErr := collectorsimulator.SimulateTracesProcessing(
// 		ctx,
// 		processorFactories,
// 		configGenerator,
// 		simulatorInput,
// 		timeout,
// 	)
// 	if simErr != nil {
// 		if errors.Is(simErr, collectorsimulator.ErrInvalidConfig) {
// 			return nil, nil, errors.WrapInvalidInputf(simErr, errors.CodeInvalidInput, "invalid config")
// 		}
// 		return nil, nil, errors.WrapInternalf(simErr, ErrCodeSpanMapperSimulationFailed, "could not simulate span mapper processing")
// 	}

// 	outputSpans := PTracesToSpans(outputTraces)

// 	sort.Slice(outputSpans, func(i, j int) bool {
// 		iIdx, _ := outputSpans[i].Attributes[spanInputOrderAttr].(int64)
// 		jIdx, _ := outputSpans[j].Attributes[spanInputOrderAttr].(int64)
// 		return iIdx < jIdx
// 	})
// 	for _, s := range outputSpans {
// 		delete(s.Attributes, spanInputOrderAttr)
// 	}

// 	collectorWarnAndErrorLogs := []string{}
// 	for _, log := range collectorErrs {
// 		if log == "" || strings.Contains(log, "featuregate.go") {
// 			continue
// 		}
// 		collectorWarnAndErrorLogs = append(collectorWarnAndErrorLogs, log)
// 	}

// 	return outputSpans, collectorWarnAndErrorLogs, nil
// }

// SpansToPTraces packs each input span into its own ptrace.Traces with one
// ResourceSpans / ScopeSpans / Span carrying its attribute and resource maps.
func SpansToPTraces(spans []SpanMapperTestSpan) []ptrace.Traces {
	result := make([]ptrace.Traces, 0, len(spans))
	for _, s := range spans {
		td := ptrace.NewTraces()
		rs := td.ResourceSpans().AppendEmpty()
		if s.Resource != nil {
			_ = rs.Resource().Attributes().FromRaw(s.Resource)
		}
		sl := rs.ScopeSpans().AppendEmpty()
		span := sl.Spans().AppendEmpty()
		if s.Attributes != nil {
			_ = span.Attributes().FromRaw(s.Attributes)
		}
		result = append(result, td)
	}
	return result
}

// PTracesToSpans flattens simulator output back into SpanMapperTestSpan: one
// entry per individual Span across all ResourceSpans / ScopeSpans.
func PTracesToSpans(traces []ptrace.Traces) []SpanMapperTestSpan {
	result := []SpanMapperTestSpan{}
	for _, td := range traces {
		rss := td.ResourceSpans()
		for i := 0; i < rss.Len(); i++ {
			rs := rss.At(i)
			resourceAttrs := rs.Resource().Attributes().AsRaw()
			ilss := rs.ScopeSpans()
			for j := 0; j < ilss.Len(); j++ {
				spans := ilss.At(j).Spans()
				for k := 0; k < spans.Len(); k++ {
					result = append(result, SpanMapperTestSpan{
						Attributes: spans.At(k).Attributes().AsRaw(),
						Resource:   resourceAttrs,
					})
				}
			}
		}
	}
	return result
}

func filterEnabledGroupsWithMappers(groups []*SpanMapperGroupWithMappers) []*SpanMapperGroupWithMappers {
	out := make([]*SpanMapperGroupWithMappers, 0, len(groups))
	for _, gm := range groups {
		if gm == nil || gm.Group == nil || !gm.Group.Enabled {
			continue
		}
		enabled := make([]*SpanMapper, 0, len(gm.Mappers))
		for _, m := range gm.Mappers {
			if m != nil && m.Enabled {
				enabled = append(enabled, m)
			}
		}
		if len(enabled) > 0 {
			out = append(out, &SpanMapperGroupWithMappers{Group: gm.Group, Mappers: enabled})
		}
	}
	return out
}
