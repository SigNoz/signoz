package coretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var errCodeInvalidResourceID = errors.MustNewCode("invalid_resource_id")

// SelectorFunc maps a resolved id (+ its resource) to authz FGA selectors. It is
// the sole source of selectors — there is no default fallback to wildcard. Given
// a missing id it decides for itself whether to return a wildcard or an error.
// orgID scopes any lookup a custom selector performs (e.g. role UUID -> name).
type SelectorFunc func(ctx context.Context, resource Resource, id string, orgID valuer.UUID) ([]Selector, error)

// WildcardSelector ignores the id and returns the resource's wildcard selector.
// Use for create / list / collection routes.
var WildcardSelector SelectorFunc = func(_ context.Context, resource Resource, _ string, _ valuer.UUID) ([]Selector, error) {
	return []Selector{resource.Type().MustSelector(WildCardSelectorString)}, nil
}

// IDSelector returns [exact, wildcard] for a present id and errors when the id is
// missing. Use for instance routes whose id is in the path/body.
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
