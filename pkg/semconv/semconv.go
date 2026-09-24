package semconv

import (
	"slices"

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
	for _, idx := range memberToFamilies[selector.Name] {
		if matchesSelector(families[idx], kind, selector) {
			return idx, true
		}
	}
	return 0, false
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
