package querier

import (
	"encoding/json"
	"strings"
	"unicode"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/semconv"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// semconvResolutionsForRequest reports the family spellings a query builder
// request names. Raw ClickHouse SQL and PromQL are not rewritten, so they
// report nothing.
func semconvResolutionsForRequest(req *qbtypes.QueryRangeRequest) []qbtypes.SemconvResolution {
	if req == nil {
		return nil
	}

	resolutions := make([]qbtypes.SemconvResolution, 0)
	seen := make(map[string]struct{})
	for _, envelope := range req.CompositeQuery.Queries {
		signal, metric, applies := semconvResolutionSignal(envelope.Spec)
		if !applies {
			continue
		}

		payload, err := json.Marshal(envelope.Spec)
		if err != nil {
			continue
		}
		text := string(payload)

		for family := range semconv.All() {
			if family.Kind() == semconv.KindMetric && signal != telemetrytypes.SignalMetrics {
				continue
			}
			selector := telemetrytypes.FieldKeySelector{Name: family.Current(), Signal: signal, MetricContext: metric}
			spellings := semconv.Members(family.Kind(), selector)
			if family.Kind() == semconv.KindAttribute && signal == telemetrytypes.SignalMetrics {
				spellings = querybuilder.MetricLabelSpellings(selector)
			}
			if len(spellings) <= 1 {
				continue
			}

			for _, requested := range spellings {
				if !containsSemconvName(text, requested) {
					continue
				}
				identity := family.Kind().StringValue() + "\x00" + requested + "\x00" + family.Current()
				if _, ok := seen[identity]; ok {
					continue
				}
				seen[identity] = struct{}{}
				resolutions = append(resolutions, qbtypes.SemconvResolution{
					Requested: requested,
					Current:   family.Current(),
					Members:   append([]string{family.Current()}, family.Old()...),
					Kind:      family.Kind().StringValue(),
				})
			}
		}
	}

	if len(resolutions) == 0 {
		return nil
	}
	return resolutions
}

func semconvResolutionSignal(spec any) (telemetrytypes.Signal, *telemetrytypes.MetricContext, bool) {
	switch query := spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], qbtypes.QueryBuilderTraceOperator:
		return telemetrytypes.SignalTraces, nil, true
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		return telemetrytypes.SignalLogs, nil, true
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		var metric *telemetrytypes.MetricContext
		if len(query.Aggregations) > 0 {
			metric = &telemetrytypes.MetricContext{MetricName: query.Aggregations[0].MetricName}
		}
		return telemetrytypes.SignalMetrics, metric, true
	case qbtypes.QueryBuilderJoin:
		// A join can hold several signals. The unspecified signal keeps the
		// family signal gates in force and admits every applicable family.
		return telemetrytypes.SignalUnspecified, nil, true
	default:
		return telemetrytypes.SignalUnspecified, nil, false
	}
}

// containsSemconvName reports whether name occurs in text as a whole key. A
// field context prefix counts as a boundary, so `resource.x` names `x`.
func containsSemconvName(text, name string) bool {
	for offset := 0; offset < len(text); {
		index := strings.Index(text[offset:], name)
		if index < 0 {
			return false
		}
		start := offset + index
		end := start + len(name)
		if hasSemconvNameStartBoundary(text, start) &&
			(end == len(text) || !isSemconvNameRune(rune(text[end]))) {
			return true
		}
		offset = start + 1
	}
	return false
}

func hasSemconvNameStartBoundary(text string, start int) bool {
	if start == 0 || !isSemconvNameRune(rune(text[start-1])) {
		return true
	}

	for _, qualifier := range []string{"resource.", "attribute.", "tag.", "point."} {
		qualifierStart := start - len(qualifier)
		if qualifierStart >= 0 && text[qualifierStart:start] == qualifier &&
			(qualifierStart == 0 || !isSemconvNameRune(rune(text[qualifierStart-1]))) {
			return true
		}
	}
	return false
}

func isSemconvNameRune(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '.' || r == '-'
}
