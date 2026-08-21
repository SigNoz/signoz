package semconv

import (
	"iter"
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

// Member is one historical spelling of a family, with the scope its rename
// edges declared. A nil axis places no constraint on that axis.
type Member struct {
	name           string
	contexts       []telemetrytypes.FieldContext
	signals        []telemetrytypes.Signal
	applyToMetrics []string
}

// Name returns the member spelling.
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
	valueMap map[string]string
}

// Current returns the current name of the family.
func (f Family) Current() string {
	return f.current
}

// Kind returns the family kind.
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

// Lookup returns the family that resolves selector.Name for kind.
//
// The missing-information policy is the same on every axis (signal, field
// context, metric name): an axis the selector does not populate is a wildcard
// and constrains nothing. When the wildcards leave more than one family
// admitted, the name does not resolve — resolution never picks an arbitrary
// winner, it asks for more information by staying literal.
func Lookup(kind Kind, selector telemetrytypes.FieldKeySelector) (Family, bool) {
	idx, ok := lookupIndex(kind, selector)
	if !ok {
		return Family{}, false
	}
	return families[idx], true
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

// AttributeMembers returns the physical attribute spellings that may represent
// selector.Name. Metrics have used both dotted and normalized label layouts,
// and resource labels have additionally used a resource_ prefix, so metric
// selectors expand every admitted member into those spellings; keeping that
// storage detail here prevents metrics readers from maintaining local
// transition tables. Every other signal gets the plain member list.
func AttributeMembers(selector telemetrytypes.FieldKeySelector) []string {
	if selector.Signal != telemetrytypes.SignalMetrics {
		return Members(KindAttribute, selector)
	}

	lookupSelector := selector
	lookupSelector.Name = strings.TrimPrefix(selector.Name, "resource_")
	idx, style, ok := lookupMetricSpelling(KindAttribute, lookupSelector)
	if !ok {
		return []string{selector.Name}
	}

	logicalMembers := admittedMembers(idx, lookupSelector)
	result := make([]string, 0, len(logicalMembers)*4)
	for _, member := range logicalMembers {
		variants := []string{member, normalizeMetricSpelling(member)}
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
	idx, style, ok := lookupMetricSpelling(KindMetric, selector)
	if !ok {
		return []string{name}
	}

	logicalMembers := admittedMembers(idx, selector)
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
	if selector.Signal != telemetrytypes.SignalMetrics {
		return Current(KindAttribute, selector)
	}

	lookupSelector := selector
	lookupSelector.Name = strings.TrimPrefix(selector.Name, "resource_")
	idx, _, ok := lookupMetricSpelling(KindAttribute, lookupSelector)
	if !ok {
		return selector.Name
	}
	return families[idx].current
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
	for i, family := range families {
		members[i] = make([]string, 0, len(family.members)+1)
		members[i] = append(members[i], family.current)
		index[family.current] = append(index[family.current], i)
		for _, member := range family.members {
			members[i] = append(members[i], member.name)
			if !slices.Contains(index[member.name], i) {
				index[member.name] = append(index[member.name], i)
			}
		}
	}
	return index, members
}

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

type metricSpelling int

const (
	metricSpellingDotted metricSpelling = iota
	metricSpellingNormalized
)

// lookupMetricSpelling resolves a metric spelling to its family: first as the
// canonical dotted name, then by comparing the normalized form of every
// family spelling. The ambiguity rule of lookupIndex applies to both styles.
func lookupMetricSpelling(kind Kind, selector telemetrytypes.FieldKeySelector) (int, metricSpelling, bool) {
	if idx, ok := lookupIndex(kind, selector); ok {
		return idx, metricSpellingDotted, true
	}

	found, foundIdx := 0, 0
	for idx := range families {
		if normalizedFamilyAdmits(families[idx], kind, selector) {
			found++
			foundIdx = idx
		}
	}
	if found != 1 {
		return 0, metricSpellingDotted, false
	}
	return foundIdx, metricSpellingNormalized, true
}

func normalizedFamilyAdmits(family Family, kind Kind, selector telemetrytypes.FieldKeySelector) bool {
	if normalizeMetricSpelling(family.current) == selector.Name ||
		slices.ContainsFunc(family.members, func(member Member) bool {
			return normalizeMetricSpelling(member.name) == selector.Name
		}) {
		dotted := selector
		dotted.Name = denormalizeAgainst(family, selector.Name)
		return familyAdmits(family, kind, dotted)
	}
	return false
}

func denormalizeAgainst(family Family, name string) string {
	if normalizeMetricSpelling(family.current) == name {
		return family.current
	}
	for _, member := range family.members {
		if normalizeMetricSpelling(member.name) == name {
			return member.name
		}
	}
	return name
}

func normalizeMetricSpelling(name string) string {
	return strings.ReplaceAll(name, ".", "_")
}

func appendUniqueString(values []string, value string) []string {
	if slices.Contains(values, value) {
		return values
	}
	return append(values, value)
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
