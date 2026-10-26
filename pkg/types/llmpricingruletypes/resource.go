package llmpricingruletypes

import (
	"context"
	"slices"

	"github.com/tidwall/gjson"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// UpdatableRulesResources resolves the pricing rules an upsert body writes to.
//
// A rule with isOverride and an id is an edit, checked by that id. Everything
// else resolves to the wildcard: isOverride without an id is a create, sourceId
// without isOverride is a sync row, and an empty list has nothing to check.
func UpdatableRulesResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	rules := gjson.GetBytes(ec.RequestBody, "rules").Array()

	ids := make([]string, 0, len(rules))
	wildcard := len(rules) == 0
	for _, rule := range rules {
		rawID := rule.Get("id").String()
		isOverride := rule.Get("isOverride").Type
		if rawID == "" || (isOverride != gjson.True && isOverride != gjson.False) {
			wildcard = true
			continue
		}

		// Normalised through valuer so an uppercase id still matches the
		// lowercase selector regex of the metaresource type.
		id, err := valuer.NewUUID(rawID)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePricingRuleInvalidInput, "rule id %q is not a valid uuid", rawID)
		}
		if !slices.Contains(ids, id.StringValue()) {
			ids = append(ids, id.StringValue())
		}
	}
	if wildcard {
		ids = append(ids, coretypes.WildCardSelectorString)
	}

	resources := make([]coretypes.ResourceWithID, 0, len(ids))
	for _, id := range ids {
		resources = append(resources, coretypes.ResourceWithID{Resource: coretypes.ResourceMetaResourceLLMPricingRule, ID: id})
	}

	return resources, nil
}

// RuleSelector exists because IDSelector would turn the wildcard entry into
// the wildcard twice; an id still resolves to the id plus the wildcard.
func RuleSelector(ctx context.Context, resource coretypes.Resource, id string, orgID valuer.UUID) ([]coretypes.Selector, error) {
	if id == coretypes.WildCardSelectorString {
		return coretypes.WildcardSelector(ctx, resource, id, orgID)
	}

	return coretypes.IDSelector(ctx, resource, id, orgID)
}
