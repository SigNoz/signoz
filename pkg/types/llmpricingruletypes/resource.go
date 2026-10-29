package llmpricingruletypes

import (
	"context"
	"encoding/json"
	"slices"

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
	// encoding/json with the handler's tags, so duplicate or case-variant id
	// keys resolve to the id that is actually written.
	var body struct {
		Rules []*struct {
			// Normalised through valuer so an uppercase id still matches the
			// lowercase selector regex of the metaresource type.
			ID         *valuer.UUID `json:"id"`
			IsOverride *bool        `json:"isOverride"`
		} `json:"rules"`
	}
	if err := json.Unmarshal(ec.RequestBody, &body); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePricingRuleInvalidInput, "invalid pricing rules body")
	}

	ids := make([]string, 0, len(body.Rules))
	wildcard := len(body.Rules) == 0
	for _, rule := range body.Rules {
		if rule == nil || rule.ID == nil || rule.IsOverride == nil {
			wildcard = true
			continue
		}

		if !slices.Contains(ids, rule.ID.StringValue()) {
			ids = append(ids, rule.ID.StringValue())
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
