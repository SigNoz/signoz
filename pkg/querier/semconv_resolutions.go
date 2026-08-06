package querier

import (
	"encoding/json"
	"slices"
	"strings"
	"unicode"

	"github.com/SigNoz/signoz/pkg/semconv"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// semconvResolutionsForRequest reports only query-builder resolutions. Raw
// ClickHouse SQL and PromQL are deliberately excluded: SigNoz does not rewrite
// those languages and their editors surface non-blocking warnings instead.
func semconvResolutionsForRequest(req *qbtypes.QueryRangeRequest) []qbtypes.SemconvResolution {
	if req == nil {
		return nil
	}

	resolutions := make([]qbtypes.SemconvResolution, 0)
	seen := make(map[string]struct{})
	for _, envelope := range req.CompositeQuery.Queries {
		signal, applies := semconvResolutionSignal(envelope.Spec)
		if !applies {
			continue
		}

		payload, err := json.Marshal(envelope.Spec)
		if err != nil {
			continue
		}
		text := string(payload)

		for _, family := range semconv.All() {
			if _, ok := semconv.Lookup(family.Kind, telemetrytypes.FieldKeySelector{
				Name:   family.Current,
				Signal: signal,
			}); !ok {
				continue
			}

			for _, requested := range semconvRequestSpellings(family, signal) {
				if !containsSemconvRequestName(text, requested) {
					continue
				}
				identity := family.Kind.StringValue() + "\x00" + requested + "\x00" + family.Current
				if _, ok := seen[identity]; ok {
					continue
				}
				seen[identity] = struct{}{}
				resolutions = append(resolutions, qbtypes.SemconvResolution{
					Requested: requested,
					Current:   family.Current,
					Members:   append([]string{family.Current}, family.Old...),
					Kind:      family.Kind.StringValue(),
				})
			}
		}
	}

	if len(resolutions) == 0 {
		return nil
	}
	return resolutions
}

func semconvResolutionSignal(spec any) (telemetrytypes.Signal, bool) {
	switch spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], qbtypes.QueryBuilderTraceOperator:
		return telemetrytypes.SignalTraces, true
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		return telemetrytypes.SignalLogs, true
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		return telemetrytypes.SignalMetrics, true
	case qbtypes.QueryBuilderJoin:
		// Joins can contain more than one signal. An unspecified signal keeps
		// family signal scopes in force while allowing every applicable family.
		return telemetrytypes.SignalUnspecified, true
	default:
		return telemetrytypes.SignalUnspecified, false
	}
}

func semconvRequestSpellings(family semconv.Family, signal telemetrytypes.Signal) []string {
	spellings := append([]string{family.Current}, family.Old...)
	if signal != telemetrytypes.SignalMetrics {
		return spellings
	}

	logical := slices.Clone(spellings)
	for _, name := range logical {
		normalized := strings.ReplaceAll(name, ".", "_")
		if !slices.Contains(spellings, normalized) {
			spellings = append(spellings, normalized)
		}
		if family.Kind == semconv.KindAttribute {
			for _, resourceName := range []string{"resource_" + name, "resource_" + normalized} {
				if !slices.Contains(spellings, resourceName) {
					spellings = append(spellings, resourceName)
				}
			}
		}
	}
	return spellings
}

func containsSemconvRequestName(text, name string) bool {
	if containsSemconvName(text, name) {
		return true
	}
	// Filter expressions qualify attributes with their field context. A dot is
	// otherwise part of a semantic-convention name, so check the two contexts
	// that can contain schema attribute families explicitly. This still rejects
	// larger custom names such as custom.deployment.environment.
	for _, context := range []string{"attribute.", "resource."} {
		if containsSemconvName(text, context+name) {
			return true
		}
	}
	return false
}

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
