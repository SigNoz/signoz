package semconv

import (
	"iter"
	"slices"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

//go:generate go run ../../scripts/semconv

// Kind identifies whether a family describes an attribute or a metric name.
type Kind struct {
	valuer.String
}

// Member is one historical spelling of a family, with the scope its rename
// edges declared. A nil axis places no constraint on that axis.
type Member struct {
	name           string
	contexts       []telemetrytypes.FieldContext
	signals        []telemetrytypes.Signal
	applyToMetrics []string
}

func (m Member) Name() string {
	return m.name
}

// Family is one logical telemetry field. Members are ordered from the most
// recent predecessor to the oldest one and therefore also define fallback
// order. The family-level contexts and signals come from the overlay and gate
// where the family may resolve at all; member scopes come from the schema
// edges and gate which members apply for a given selector.
type Family struct {
	current  string
	kind     Kind
	members  []Member
	contexts []telemetrytypes.FieldContext
	signals  []telemetrytypes.Signal
}

func (f Family) Current() string {
	return f.current
}

func (f Family) Kind() Kind {
	return f.kind
}

// Old returns the historical spellings in fallback order.
func (f Family) Old() []string {
	names := make([]string, len(f.members))
	for i, member := range f.members {
		names[i] = member.name
	}
	return names
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

// Members returns the current name first, followed by the historical spellings
// admitted for the selector, in fallback order. A name outside an enabled
// family — or one the selector leaves ambiguous — is returned unchanged. The
// returned slice must not be modified.
func Members(kind Kind, selector telemetrytypes.FieldKeySelector) []string {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return []string{selector.Name}
	}
	return admittedMembers(idx, selector)
}

func admittedMembers(idx int, selector telemetrytypes.FieldKeySelector) []string {
	admitted := 0
	for _, member := range families[idx].members {
		if memberAdmits(member, selector) {
			admitted++
		}
	}
	if admitted == len(families[idx].members) {
		return familyMembers[idx]
	}
	names := make([]string, 0, admitted+1)
	names = append(names, families[idx].current)
	for _, member := range families[idx].members {
		if memberAdmits(member, selector) {
			names = append(names, member.name)
		}
	}
	return names
}

// Current returns the current name for selector.Name, or the input name when
// it does not resolve to a family.
func Current(kind Kind, selector telemetrytypes.FieldKeySelector) string {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return selector.Name
	}
	return families[idx].current
}

// All iterates over every enabled family.
func All() iter.Seq[Family] {
	return func(yield func(Family) bool) {
		for _, family := range families {
			if !yield(family) {
				return
			}
		}
	}
}

func buildIndexes() (map[string][]int, [][]string) {
	index := make(map[string][]int)
	members := make([][]string, len(families))
	add := func(name string, i int) {
		if !slices.Contains(index[name], i) {
			index[name] = append(index[name], i)
		}
	}
	for i, family := range families {
		members[i] = make([]string, 0, len(family.members)+1)
		members[i] = append(members[i], family.current)
		add(family.current, i)
		for _, member := range family.members {
			members[i] = append(members[i], member.name)
			add(member.name, i)
		}
	}
	return index, members
}

// lookupIndex returns the family that resolves selector.Name for kind.
//
// The missing-information policy is the same on every axis (signal, field
// context, metric name): an axis the selector does not populate is a wildcard
// and constrains nothing. When the wildcards leave more than one family
// admitted, the name does not resolve — resolution never picks an arbitrary
// winner, it asks for more information by staying literal.
func lookupIndex(kind Kind, selector telemetrytypes.FieldKeySelector) (int, bool) {
	found, foundIdx := 0, 0
	for _, idx := range memberToFamilies[selector.Name] {
		if familyAdmits(families[idx], kind, selector) {
			found++
			foundIdx = idx
		}
	}
	if found != 1 {
		return 0, false
	}
	return foundIdx, true
}

// familyAdmits reports whether the family resolves selector.Name: the
// family-level gate must admit the selector, and the name must be the current
// name or an admitted member.
func familyAdmits(family Family, kind Kind, selector telemetrytypes.FieldKeySelector) bool {
	if family.kind != kind {
		return false
	}
	if !axisAdmits(family.signals, selector.Signal, telemetrytypes.SignalUnspecified) {
		return false
	}
	if !axisAdmits(family.contexts, selector.FieldContext, telemetrytypes.FieldContextUnspecified) {
		return false
	}
	if selector.Name == family.current {
		for _, member := range family.members {
			if memberAdmits(member, selector) {
				return true
			}
		}
		return false
	}
	for _, member := range family.members {
		if member.name == selector.Name && memberAdmits(member, selector) {
			return true
		}
	}
	return false
}

// memberAdmits reports whether the member applies for the selector under the
// wildcard policy: a selector axis without a value never constrains, and a
// member axis without a value admits every selector value.
func memberAdmits(member Member, selector telemetrytypes.FieldKeySelector) bool {
	if !axisAdmits(member.signals, selector.Signal, telemetrytypes.SignalUnspecified) {
		return false
	}
	if !axisAdmits(member.contexts, selector.FieldContext, telemetrytypes.FieldContextUnspecified) {
		return false
	}
	if len(member.applyToMetrics) > 0 &&
		selector.MetricContext != nil && selector.MetricContext.MetricName != "" &&
		!slices.Contains(member.applyToMetrics, selector.MetricContext.MetricName) {
		return false
	}
	return true
}

func axisAdmits[T comparable](scope []T, value T, unspecified T) bool {
	if len(scope) == 0 || value == unspecified {
		return true
	}
	return slices.Contains(scope, value)
}
