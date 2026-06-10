package coretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var errCodeInvalidResourceID = errors.MustNewCode("invalid_resource_id")

// SelectorFunc maps a resolved id (+ its resource) to authz FGA selectors.
type SelectorFunc func(ctx context.Context, resource Resource, id string, orgID valuer.UUID) ([]Selector, error)

var WildcardSelector SelectorFunc = func(_ context.Context, resource Resource, _ string, _ valuer.UUID) ([]Selector, error) {
	return []Selector{resource.Type().MustSelector(WildCardSelectorString)}, nil
}

var IDSelector SelectorFunc = func(_ context.Context, resource Resource, id string, _ valuer.UUID) ([]Selector, error) {
	if id == "" {
		return nil, errors.Newf(
			errors.TypeInvalidInput,
			errCodeInvalidResourceID,
			"resource id is required for %s",
			resource.Kind().String(),
		)
	}

	selector, err := resource.Type().Selector(id)
	if err != nil {
		return nil, err
	}

	return []Selector{selector, resource.Type().MustSelector(WildCardSelectorString)}, nil
}
