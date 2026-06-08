// Storing and retrieving the resolved resource list on the request context.
package handler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
)

var errCodeResolvedResourcesNotFound = errors.MustNewCode("resolved_resources_not_found")

// resolvedKey is the context key under which the resolved resource list is stored.
type resolvedKey struct{}

// NewContextWithResolvedResources stores the resolved resource list in the
// context. Entries are pointers so the audit middleware can finalize
// response-phase ids in place after the handler runs.
func NewContextWithResolvedResources(ctx context.Context, resolved []*ResolvedResource) context.Context {
	return context.WithValue(ctx, resolvedKey{}, resolved)
}

// ResolvedResourcesFromContext returns the resolved resource list placed by the
// Resource middleware, or an error if no list is present (the route declared no
// ResourceDefs or the Resource middleware is not wired). Entries are pointers so
// the audit middleware can finalize response-phase ids in place.
func ResolvedResourcesFromContext(ctx context.Context) ([]*ResolvedResource, error) {
	resolved, ok := ctx.Value(resolvedKey{}).([]*ResolvedResource)
	if !ok {
		return nil, errors.New(errors.TypeInternal, errCodeResolvedResourcesNotFound, "resolved resources not found in context")
	}

	return resolved, nil
}
