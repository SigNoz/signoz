package spantypes

import (
	"context"
	"maps"
	"sort"
	"time"

	"github.com/SigNoz/signoz-otel-collector/pkg/collectorsimulator"
	"github.com/SigNoz/signoz-otel-collector/processor/signozspanmapperprocessor"
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/collector/otelcol"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"gopkg.in/yaml.v3"
)

var (
	ErrCodeProcessorFactoryMapFailed  = errors.MustNewCode("processor_factory_map_failed")
	ErrCodeSpanMapperSimulationFailed = errors.MustNewCode("span_mapper_simulation_failed")
)

const spanInputOrderAttr = "__signoz_input_idx__"

func SimulateSpanMappersProcessing(ctx context.Context, groups []*SpanMapperGroupWithMappers, spans []SpanMapperTestSpan) ([]SpanMapperTestSpan, []string, error) {
	enabled := filterEnabledGroupsWithMappers(groups)
	if len(enabled) < 1 {
		return spans, nil, nil
	}

	// Tag each span with its request position so the output can be returned in
	// input order; work on copies so the caller's attribute maps stay untouched.
	inputSpans := make([]SpanMapperTestSpan, len(spans))
	for i, s := range spans {
		attrs := make(map[string]any, len(s.Attributes)+1)
		maps.Copy(attrs, s.Attributes)
		attrs[spanInputOrderAttr] = int64(i)
		inputSpans[i] = SpanMapperTestSpan{Attributes: attrs, Resource: s.Resource}
	}
	simulatorInput := SpansToPTraces(inputSpans)

	processorFactories, err := otelcol.MakeFactoryMap(signozspanmapperprocessor.NewFactory())
	if err != nil {
		return nil, nil, errors.WrapInternalf(err, ErrCodeProcessorFactoryMapFailed, "could not construct processor factory map")
	}

	configGenerator := func(baseConf []byte) ([]byte, error) {
		withProcessor, err := GenerateCollectorConfigWithSpanMapperProcessor(baseConf, enabled)
		if err != nil {
			return nil, err
		}
		return wireSpanMapperIntoTracesPipeline(withProcessor)
	}

	// signozspanmapperprocessor does no batching; spans flow through immediately.
	timeout := 200 * time.Millisecond

	outputTraces, collectorErrs, simErr := collectorsimulator.SimulateTracesProcessing(
		ctx,
		processorFactories,
		configGenerator,
		simulatorInput,
		timeout,
	)
	if simErr != nil {
		if errors.Is(simErr, collectorsimulator.ErrInvalidConfig) {
			return nil, nil, errors.WrapInvalidInputf(simErr, errors.CodeInvalidInput, "invalid config")
		}
		return nil, nil, errors.WrapInternalf(simErr, ErrCodeSpanMapperSimulationFailed, "could not simulate span mapper processing")
	}

	outputSpans := PTracesToSpans(outputTraces)

	// The simulator returns whatever has been exported when its timeout
	// elapses, without error; surface that instead of silently dropping spans.
	if len(outputSpans) != len(spans) {
		return nil, nil, errors.Newf(errors.TypeInternal, ErrCodeSpanMapperSimulationFailed, "simulation returned %d spans for %d input spans", len(outputSpans), len(spans))
	}

	sort.Slice(outputSpans, func(i, j int) bool {
		iIdx, _ := outputSpans[i].Attributes[spanInputOrderAttr].(int64)
		jIdx, _ := outputSpans[j].Attributes[spanInputOrderAttr].(int64)
		return iIdx < jIdx
	})
	for _, s := range outputSpans {
		delete(s.Attributes, spanInputOrderAttr)
	}

	return outputSpans, collectorErrs, nil
}

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

// wireSpanMapperIntoTracesPipeline appends "signozspanmapper" to
// service.pipelines.traces.processors so the processor defined by
// GenerateCollectorConfigWithSpanMapperProcessor actually runs against the
// traces flowing through the simulator. Idempotent: skips appending if the
// processor name is already present. Errors if the config has no traces
// pipeline, since the simulation would otherwise silently pass spans through.
func wireSpanMapperIntoTracesPipeline(confYaml []byte) ([]byte, error) {
	var conf map[string]any
	if err := yaml.Unmarshal(confYaml, &conf); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeInvalidCollectorConfig, "failed to unmarshal collector config for pipeline wiring")
	}
	// Failed assertions yield nil, and indexing a nil map is safe,
	// so any missing/mistyped level surfaces as traces == nil below.
	service, _ := conf["service"].(map[string]any)
	pipelines, _ := service["pipelines"].(map[string]any)
	traces, _ := pipelines["traces"].(map[string]any)
	if traces == nil {
		return nil, errors.Newf(errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "collector config has no service.pipelines.traces pipeline to wire %q into", ProcessorName)
	}

	procs, _ := traces["processors"].([]any)
	for _, p := range procs {
		if name, ok := p.(string); ok && name == ProcessorName {
			return confYaml, nil
		}
	}
	traces["processors"] = append(procs, ProcessorName)

	out, err := yaml.Marshal(conf)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "failed to marshal collector config after pipeline wiring")
	}
	return out, nil
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
