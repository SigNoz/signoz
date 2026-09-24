package querybuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// semconvFamiliesEnabled evaluates the resolve_semconv_families flag for the
// org. A nil flagger means off, so a caller without family support stays
// literal by default.
func semconvFamiliesEnabled(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger) bool {
	if fl == nil {
		return false
	}
	return fl.BooleanOrEmpty(ctx, flagger.FeatureResolveSemconvFamilies, featuretypes.NewFlaggerEvaluationContext(orgID))
}

// ExpandKeySelectorsForFamilies adds selectors for the other members of each
// semantic-convention family that a selector names. The metadata fetched for
// a query then contains each spelling that MatchingLogicalFields can group.
// This function is the prefetch of the resolution layer: statement builders
// call it after they derive the selectors, and the metadata store stays
// family-blind (autocomplete responses keep the literal spelling that the
// user typed). It does nothing when the resolve_semconv_families flag is off
// for the org. Only trace selectors expand today, because that matches the
// family support. Fuzzy (search-style) selectors never expand.
func ExpandKeySelectorsForFamilies(ctx context.Context, orgID valuer.UUID, fl flagger.Flagger, selectors []*telemetrytypes.FieldKeySelector) []*telemetrytypes.FieldKeySelector {
	if !semconvFamiliesEnabled(ctx, orgID, fl) {
		return selectors
	}

	out := selectors
	seen := make(map[string]bool, len(selectors))
	for _, selector := range selectors {
		seen[selector.Name] = true
	}

	for _, selector := range selectors {
		if selector.Signal != telemetrytypes.SignalTraces ||
			selector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeFuzzy {
			continue
		}
		members := semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{
			Name:         selector.Name,
			Signal:       selector.Signal,
			FieldContext: selector.FieldContext,
		})
		for _, member := range members {
			if seen[member] {
				continue
			}
			seen[member] = true
			expanded := *selector
			expanded.Name = member
			out = append(out, &expanded)
		}
	}
	return out
}
