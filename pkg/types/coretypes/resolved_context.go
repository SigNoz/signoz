package coretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
)

var errCodeResolvedResourcesNotFound = errors.MustNewCode("resolved_resources_not_found")

type resolvedKey struct{}

func NewContextWithResolvedResources(ctx context.Context, resolved []ResolvedResource) context.Context {
	return context.WithValue(ctx, resolvedKey{}, resolved)
}

func ResolvedResourcesFromContext(ctx context.Context) ([]ResolvedResource, error) {
	resolved, ok := ctx.Value(resolvedKey{}).([]ResolvedResource)
	if !ok {
		return nil, errors.New(errors.TypeInternal, errCodeResolvedResourcesNotFound, "resolved resources not found in context")
	}

	return resolved, nil
}
