package coretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
)

var errCodeResolvedResourcesNotFound = errors.MustNewCode("resolved_resources_not_found")

type resolvedKey struct{}

// ResolvedResource is the resolved form of a resource def, produced by the
// resource middleware and read by authz and audit.
type ResolvedResource interface {
	Verb() Verb
	Category() ActionCategory
	SourceResource() Resource
	SourceIDs() []string
	SourceSelector() SelectorFunc
	ResolveResponse(ec ExtractorContext)
	// hasResponsePhase reports whether an id is resolved from the response body.
	hasResponsePhase() bool
}

type ResolvedResourceWithTargetResource interface {
	ResolvedResource
	TargetResource() Resource
	TargetIDs() []string
	TargetSelector() SelectorFunc
	// IsParentChild true: the target is a child audited along but not authz-checked
	// (only the source is); false: a sibling peer that is also authz-checked.
	IsParentChild() bool
}

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

// ShouldCaptureResponseBody reports whether any resolved resource in ctx derives
// an id from the response body.
func ShouldCaptureResponseBody(ctx context.Context) bool {
	resolved, err := ResolvedResourcesFromContext(ctx)
	if err != nil {
		return false
	}

	for _, resource := range resolved {
		if resource.hasResponsePhase() {
			return true
		}
	}

	return false
}
