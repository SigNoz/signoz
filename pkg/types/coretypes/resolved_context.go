package coretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
)

var errCodeResolvedResourcesNotFound = errors.MustNewCode("resolved_resources_not_found")

// resolvedKey is the context key under which the resolved resource list is stored.
type resolvedKey struct{}

// NewContextWithResolvedResources stores the resolved resource list. Each entry
// is an interface backed by a pointer, so the audit middleware's ResolveResponse
// finalizes response-phase ids in place.
func NewContextWithResolvedResources(ctx context.Context, resolved []ResolvedResource) context.Context {
	return context.WithValue(ctx, resolvedKey{}, resolved)
}

// ResolvedResourcesFromContext returns the resolved resource list placed by the
// resource middleware, or an error if none is present (the route declared no
// resource defs or the resource middleware is not wired).
func ResolvedResourcesFromContext(ctx context.Context) ([]ResolvedResource, error) {
	resolved, ok := ctx.Value(resolvedKey{}).([]ResolvedResource)
	if !ok {
		return nil, errors.New(errors.TypeInternal, errCodeResolvedResourcesNotFound, "resolved resources not found in context")
	}

	return resolved, nil
}
