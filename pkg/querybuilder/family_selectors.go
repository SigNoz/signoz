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
// Every call site pairs this prefetch with Resolve at query time. A site
// without the prefetch degrades soft. The metadata lacks the sibling, and
// the name stays literal. It never merges wrong.
func ExpandKeySelectorsForFamilies(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, selectors []*telemetrytypes.FieldKeySelector) []*telemetrytypes.FieldKeySelector {
	if !SemconvFamiliesEnabled(ctx, orgID, fl) {
		return selectors
	}

	// Two selectors can share a name under different contexts, signals, or
	// data types, and each needs its own sibling selectors. The metric context
	// is not part of the key: metric callers duplicate the selectors per
	// metric name after this expansion.
	type identity struct {
		signal        telemetrytypes.Signal
		fieldContext  telemetrytypes.FieldContext
		fieldDataType telemetrytypes.FieldDataType
		name          string
	}
	out := selectors
	seen := make(map[identity]bool, len(selectors))
	for _, selector := range selectors {
		seen[identity{selector.Signal, selector.FieldContext, selector.FieldDataType, selector.Name}] = true
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
			id := identity{selector.Signal, selector.FieldContext, selector.FieldDataType, member}
			if seen[id] {
				continue
			}
			seen[id] = true
			expanded := *selector
			expanded.Name = member
			out = append(out, &expanded)
		}
	}
	return out
}
