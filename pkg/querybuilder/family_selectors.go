package querybuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// SemconvFamiliesEnabled evaluates the resolve_semconv_families flag for the
// org. A nil flagger means off, so a caller without family support stays
// literal by default.
func SemconvFamiliesEnabled(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger) bool {
	if fl == nil {
		return false
	}
	return fl.BooleanOrEmpty(ctx, flagger.FeatureResolveSemconvFamilies, featuretypes.NewFlaggerEvaluationContext(orgID))
}

// ExpandKeySelectorsForFamilies adds selectors for the other spellings of
// each semantic-convention family that a selector names. The metadata fetched
// for a query then contains each spelling that MatchingLogicalFields can
// group. This function is the prefetch of the resolution layer: statement
// builders call it after they derive the selectors, and the metadata store
// stays family-blind (autocomplete responses keep the literal spelling that
// the user typed). It does nothing when the resolve_semconv_families flag is
// off for the org. Fuzzy (search-style) selectors never expand.
//
// Every call site pairs this prefetch with MatchingLogicalFields at query
// time. A site that forgets either half degrades soft: the metadata lacks the
// sibling (or the grouping never runs), and the name stays literal — never a
// wrong merge.
func ExpandKeySelectorsForFamilies(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, selectors []*telemetrytypes.FieldKeySelector) []*telemetrytypes.FieldKeySelector {
	if !SemconvFamiliesEnabled(ctx, orgID, fl) {
		return selectors
	}

	// Two selectors may share a name under different contexts, signals, or
	// data types, and each needs its own sibling selectors, so the dedupe key
	// is the full identity.
	identity := func(selector *telemetrytypes.FieldKeySelector, name string) string {
		return selector.Signal.StringValue() + ";" + selector.FieldContext.StringValue() + ";" + selector.FieldDataType.StringValue() + ";" + name
	}
	out := selectors
	seen := make(map[string]bool, len(selectors))
	for _, selector := range selectors {
		seen[identity(selector, selector.Name)] = true
	}

	for _, selector := range selectors {
		if selector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeFuzzy {
			continue
		}
		members := familySpellings(telemetrytypes.FieldKeySelector{
			Name:          selector.Name,
			Signal:        selector.Signal,
			FieldContext:  selector.FieldContext,
			MetricContext: selector.MetricContext,
		})
		for _, member := range members {
			if seen[identity(selector, member)] {
				continue
			}
			seen[identity(selector, member)] = true
			expanded := *selector
			expanded.Name = member
			out = append(out, &expanded)
		}
	}
	return out
}
