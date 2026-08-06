package semconv

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

//go:generate go run ../../scripts/semconv

// Kind identifies whether a family describes an attribute or a metric name.
type Kind struct {
	valuer.String
}

// Family is one logical telemetry field. Old is ordered from the most recent
// predecessor to the oldest one and therefore also defines fallback order.
type Family struct {
	Current        string
	Old            []string
	Kind           Kind
	Contexts       []telemetrytypes.FieldContext
	Signals        []telemetrytypes.Signal
	ApplyToMetrics []string
	ValueMap       map[string]string
}

type metricSpelling uint8

const (
	metricSpellingDotted metricSpelling = iota
	metricSpellingNormalized
)

var (
	KindAttribute = Kind{String: valuer.NewString("attribute")}
	KindMetric    = Kind{String: valuer.NewString("metric")}
)

var memberToFamilies, familyMembers = buildIndexes()

// Enum returns the acceptable values for Kind.
func (Kind) Enum() []any {
	return []any{KindAttribute, KindMetric}
}

// Lookup returns the enabled family containing selector.Name for kind. The
// returned family must not be modified.
func Lookup(kind Kind, selector telemetrytypes.FieldKeySelector) (Family, bool) {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return Family{}, false
	}
	return families[idx], true
}

// Members returns the current name first, followed by historical names in
// fallback order. A name outside an enabled family is returned unchanged. The
// returned slice must not be modified.
func Members(kind Kind, selector telemetrytypes.FieldKeySelector) []string {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return []string{selector.Name}
	}
	return familyMembers[idx]
}

// AttributeMembers returns the physical attribute spellings that may represent
// selector.Name. Metrics have used both dotted and normalized label layouts;
// resource labels have additionally used a resource_ prefix. Keeping that
// storage detail here prevents metrics readers from maintaining local
// transition tables.
func AttributeMembers(selector telemetrytypes.FieldKeySelector) []string {
	if selector.FieldResolution.IsExact() {
		return []string{selector.Name}
	}
	if selector.Signal != telemetrytypes.SignalMetrics {
		return Members(KindAttribute, selector)
	}

	lookupSelector := selector
	lookupSelector.Name = strings.TrimPrefix(selector.Name, "resource_")
	family, style, ok := lookupMetricSpelling(KindAttribute, lookupSelector)
	if !ok {
		return []string{selector.Name}
	}

	logicalMembers := familyMembers[family]
	result := make([]string, 0, len(logicalMembers)*4)
	for _, member := range logicalMembers {
		dotted := member
		normalized := normalizeMetricSpelling(member)
		variants := []string{dotted, normalized}
		if style == metricSpellingNormalized {
			variants[0], variants[1] = variants[1], variants[0]
		}

		if selector.FieldContext == telemetrytypes.FieldContextResource ||
			selector.FieldContext == telemetrytypes.FieldContextUnspecified ||
			strings.HasPrefix(selector.Name, "resource_") {
			for _, variant := range variants {
				result = appendUniqueString(result, "resource_"+variant)
			}
		}
		for _, variant := range variants {
			result = appendUniqueString(result, variant)
		}
	}
	return result
}

// MetricNames returns the current and historical storage names for a metric.
// The input's dotted or normalized style is preserved because both layouts are
// valid metric identities and must not be mixed in one query.
func MetricNames(name string) []string {
	selector := telemetrytypes.FieldKeySelector{
		Name:         name,
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextMetric,
	}
	family, style, ok := lookupMetricSpelling(KindMetric, selector)
	if !ok {
		return []string{name}
	}

	logicalMembers := familyMembers[family]
	result := make([]string, 0, len(logicalMembers))
	for _, member := range logicalMembers {
		if style == metricSpellingNormalized {
			member = normalizeMetricSpelling(member)
		}
		result = appendUniqueString(result, member)
	}
	return result
}

// CurrentAttribute returns the canonical dotted name for an attribute
// spelling, or selector.Name if no enabled family matches.
func CurrentAttribute(selector telemetrytypes.FieldKeySelector) string {
	if selector.FieldResolution.IsExact() {
		return selector.Name
	}
	if selector.Signal != telemetrytypes.SignalMetrics {
		return Current(KindAttribute, selector)
	}

	lookupSelector := selector
	lookupSelector.Name = strings.TrimPrefix(selector.Name, "resource_")
	family, _, ok := lookupMetricSpelling(KindAttribute, lookupSelector)
	if !ok {
		return selector.Name
	}
	return families[family].Current
}

// Current returns the current name for selector.Name, or the input name when
// it does not belong to an enabled family.
func Current(kind Kind, selector telemetrytypes.FieldKeySelector) string {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return selector.Name
	}
	return families[idx].Current
}

// All returns every enabled family. The returned slice and families must not be
// modified.
func All() []Family {
	return families
}

func buildIndexes() (map[string][]int, [][]string) {
	index := make(map[string][]int)
	members := make([][]string, len(families))
	for i, family := range families {
		members[i] = make([]string, 0, len(family.Old)+1)
		members[i] = append(members[i], family.Current)
		members[i] = append(members[i], family.Old...)
		index[family.Current] = append(index[family.Current], i)
		for _, old := range family.Old {
			index[old] = append(index[old], i)
		}
	}
	return index, members
}

func lookupIndex(kind Kind, selector telemetrytypes.FieldKeySelector) (int, bool) {
	if selector.FieldResolution.IsExact() {
		return 0, false
	}
	for _, idx := range memberToFamilies[selector.Name] {
		if matchesSelector(families[idx], kind, selector) {
			return idx, true
		}
	}
	return 0, false
}

func lookupMetricSpelling(kind Kind, selector telemetrytypes.FieldKeySelector) (int, metricSpelling, bool) {
	if selector.FieldResolution.IsExact() {
		return 0, metricSpellingDotted, false
	}
	if idx, ok := lookupIndex(kind, selector); ok {
		return idx, metricSpellingDotted, true
	}

	for idx, family := range families {
		if !matchesSelector(family, kind, selector) {
			continue
		}
		for _, member := range familyMembers[idx] {
			if normalizeMetricSpelling(member) == selector.Name {
				return idx, metricSpellingNormalized, true
			}
		}
	}
	return 0, metricSpellingDotted, false
}

func normalizeMetricSpelling(name string) string {
	return strings.ReplaceAll(name, ".", "_")
}

func appendUniqueString(values []string, value string) []string {
	if value == "" || slices.Contains(values, value) {
		return values
	}
	return append(values, value)
}

func matchesSelector(family Family, kind Kind, selector telemetrytypes.FieldKeySelector) bool {
	if family.Kind != kind {
		return false
	}

	if selector.Signal != telemetrytypes.SignalUnspecified && len(family.Signals) > 0 {
		if !slices.Contains(family.Signals, selector.Signal) {
			return false
		}
	}

	if selector.FieldContext != telemetrytypes.FieldContextUnspecified && len(family.Contexts) > 0 {
		if !slices.Contains(family.Contexts, selector.FieldContext) {
			return false
		}
	}

	if selector.Signal == telemetrytypes.SignalMetrics && len(family.ApplyToMetrics) > 0 {
		if selector.MetricContext == nil {
			return false
		}
		return slices.Contains(family.ApplyToMetrics, selector.MetricContext.MetricName)
	}

	return true
}
