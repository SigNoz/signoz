// Selectors that map a resolved id to authz FGA selectors.
package handler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

var errCodeInvalidResourceDef = errors.MustNewCode("invalid_resource_def")

// SelectorFunc maps a resolved id (+ its resource) to authz FGA selectors. It is
// the sole source of selectors — there is no default fallback to wildcard. Given
// a missing id it decides for itself whether to return a wildcard or an error. It
// never reads the request/body; ctx + claims are only for an optional DB lookup
// (e.g. role UUID -> name).
type SelectorFunc func(ctx context.Context, resource coretypes.Resource, id string, claims authtypes.Claims) ([]coretypes.Selector, error)

// WildcardSelector ignores the id and returns the resource's wildcard selector.
// Use for create / list / collection routes.
var WildcardSelector SelectorFunc = func(_ context.Context, resource coretypes.Resource, _ string, _ authtypes.Claims) ([]coretypes.Selector, error) {
	return []coretypes.Selector{resource.Type().MustSelector(coretypes.WildCardSelectorString)}, nil
}

// IDSelector returns [exact, wildcard] for a present id and errors when the id is
// missing. Use for instance routes whose id is in the path/body.
var IDSelector SelectorFunc = func(_ context.Context, resource coretypes.Resource, id string, _ authtypes.Claims) ([]coretypes.Selector, error) {
	if id == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, errCodeInvalidResourceDef, "resource id is required for %s", resource.Kind().String())
	}

	selector, err := resource.Type().Selector(id)
	if err != nil {
		return nil, err
	}

	return []coretypes.Selector{selector, resource.Type().MustSelector(coretypes.WildCardSelectorString)}, nil
}
