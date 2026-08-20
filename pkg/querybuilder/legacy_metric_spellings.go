package querybuilder

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Legacy metric storage spellings. The normalized era wrote label and metric
// names with underscores, and the span-metrics pipeline additionally wrote
// resource attributes with a resource_ prefix. This is a compatibility shim
// over aging data, not a property of the metrics signal: delete it when the
// span-metrics pipeline revisit lands and the normalized-era data ages out.
// The vocabulary itself (pkg/semconv) knows only canonical dotted names.

const legacyResourcePrefix = "resource_"

// MetricLabelSpellings returns the storage spellings that may hold
// selector.Name in metric labels: every admitted family member expanded into
// its dotted, normalized, and resource_-prefixed layouts, ordered
// member-major with the requested shape's layout first. A name outside an
// enabled family — or one the selector leaves ambiguous — is returned
// unchanged.
func MetricLabelSpellings(selector telemetrytypes.FieldKeySelector) []string {
	lookupSelector := selector
	lookupSelector.Name = strings.TrimPrefix(selector.Name, legacyResourcePrefix)

	members, style, ok := metricVocabulary(semconv.KindAttribute, lookupSelector)
	if !ok {
		return []string{selector.Name}
	}

	result := make([]string, 0, len(members)*4)
	resourceFirst := selector.FieldContext != telemetrytypes.FieldContextAttribute ||
		strings.HasPrefix(selector.Name, legacyResourcePrefix)
	for _, member := range members {
		variants := []string{member, normalizedMetricSpelling(member)}
		if style == legacySpellingNormalized {
			variants[0], variants[1] = variants[1], variants[0]
		}

		if resourceFirst {
			for _, variant := range variants {
				result = appendUniqueSpelling(result, legacyResourcePrefix+variant)
			}
		}
		for _, variant := range variants {
			result = appendUniqueSpelling(result, variant)
		}
		if !resourceFirst {
			for _, variant := range variants {
				result = appendUniqueSpelling(result, legacyResourcePrefix+variant)
			}
		}
	}
	return result
}

// MetricNameSpellings returns the storage names of a metric-name family in
// the requested layout: both layouts are valid metric identities and must not
// be mixed in one query.
func MetricNameSpellings(name string) []string {
	selector := telemetrytypes.FieldKeySelector{
		Name:         name,
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextMetric,
	}
	members, style, ok := metricVocabulary(semconv.KindMetric, selector)
	if !ok {
		return []string{name}
	}

	result := make([]string, 0, len(members))
	for _, member := range members {
		if style == legacySpellingNormalized {
			member = normalizedMetricSpelling(member)
		}
		result = appendUniqueSpelling(result, member)
	}
	return result
}

type legacySpelling int

const (
	legacySpellingDotted legacySpelling = iota
	legacySpellingNormalized
)

// metricVocabulary resolves a metric spelling to its family members: first as
// the canonical dotted name, then by comparing the normalized layout of every
// vocabulary spelling. The ambiguity rule of the vocabulary applies to both
// layouts: a name that admits several families stays unresolved.
func metricVocabulary(kind semconv.Kind, selector telemetrytypes.FieldKeySelector) ([]string, legacySpelling, bool) {
	if members := semconv.Members(kind, selector); len(members) > 1 {
		return members, legacySpellingDotted, true
	}

	dotted, ok := denormalizedName(kind, selector)
	if !ok {
		return nil, legacySpellingDotted, false
	}
	dottedSelector := selector
	dottedSelector.Name = dotted
	members := semconv.Members(kind, dottedSelector)
	if len(members) <= 1 {
		return nil, legacySpellingDotted, false
	}
	return members, legacySpellingNormalized, true
}

// normalizedVocabulary indexes every vocabulary spelling by kind and
// normalized layout: one candidate per family — the first of its spellings
// with that layout — with cross-family duplicates kept, so the ambiguity
// count below sees every family that carries the layout.
var normalizedVocabulary = buildNormalizedVocabulary()

func buildNormalizedVocabulary() map[semconv.Kind]map[string][]string {
	index := make(map[semconv.Kind]map[string][]string)
	for family := range semconv.All() {
		if index[family.Kind()] == nil {
			index[family.Kind()] = make(map[string][]string)
		}
		seen := make(map[string]bool)
		for _, name := range append([]string{family.Current()}, family.Old()...) {
			normalized := normalizedMetricSpelling(name)
			if seen[normalized] {
				continue
			}
			seen[normalized] = true
			index[family.Kind()][normalized] = append(index[family.Kind()][normalized], name)
		}
	}
	return index
}

// denormalizedName maps a normalized spelling back to its unique canonical
// vocabulary name. The reverse mapping is lossy in general (a dot and an
// underscore normalize identically), so only an unambiguous match resolves.
func denormalizedName(kind semconv.Kind, selector telemetrytypes.FieldKeySelector) (string, bool) {
	found, foundName := 0, ""
	for _, name := range normalizedVocabulary[kind][selector.Name] {
		probe := selector
		probe.Name = name
		if len(semconv.Members(kind, probe)) > 1 {
			found++
			foundName = name
		}
	}
	if found != 1 {
		return "", false
	}
	return foundName, true
}

func normalizedMetricSpelling(name string) string {
	return strings.ReplaceAll(name, ".", "_")
}

func appendUniqueSpelling(values []string, value string) []string {
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

// FamilyMetricNames returns the storage names a metric query must read: the
// requested name plus the other spellings of its metric-name family when the
// resolve_semconv_families flag is on for the org.
func FamilyMetricNames(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, metricName string) []string {
	if !SemconvFamiliesEnabled(ctx, orgID, fl) {
		return []string{metricName}
	}
	return MetricNameSpellings(metricName)
}
