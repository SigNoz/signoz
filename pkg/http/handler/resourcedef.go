// Declaration API a route author writes: the resource defs and the selectors
// that map a resolved id to authz selectors.
package handler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
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

// ResourceSpec is the sealed interface implemented by ResourceDef and
// ResourcesDef. Only these two satisfy WithResourceDefs.
type ResourceSpec interface {
	sealResourceSpec()
	resolveRequest(ec ExtractorContext) []*ResolvedResource
}

// ResourceDef declares one resource an operation acts on. For attach/detach,
// Related names the counterpart for audit clarity only — it is never authz-checked.
type ResourceDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	ID       ResourceIDExtractor
	Selector SelectorFunc
	Category audittypes.ActionCategory
	Related  *RelatedResource
}

// ResourcesDef declares many resources of one kind (fan-out). One resolved
// entry is produced per id.
type ResourcesDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	IDs      ResourceIDsExtractor
	Selector SelectorFunc
	Category audittypes.ActionCategory
	Related  *RelatedResource
}

// RelatedResource is a counterpart named purely for audit clarity. It carries no
// verb and no selector and is not authz-checked.
type RelatedResource struct {
	Resource coretypes.Resource
	ID       ResourceIDExtractor
}

func (ResourceDef) sealResourceSpec()  {}
func (ResourcesDef) sealResourceSpec() {}

func (d ResourceDef) resolveRequest(ec ExtractorContext) []*ResolvedResource {
	resolved := &ResolvedResource{
		Resource:    d.Resource,
		Verb:        d.Verb,
		Selector:    d.Selector,
		Category:    d.Category,
		idExtractor: d.ID,
		Related:     newResolvedRelated(d.Related),
	}
	resolved.resolve(phaseRequest, ec)

	return []*ResolvedResource{resolved}
}

func (d ResourcesDef) resolveRequest(ec ExtractorContext) []*ResolvedResource {
	var ids []string
	if d.IDs.fn != nil {
		ids, _ = d.IDs.fn(ec)
	}

	resolved := make([]*ResolvedResource, 0, len(ids))
	for _, id := range ids {
		entry := &ResolvedResource{
			Resource: d.Resource,
			Verb:     d.Verb,
			ID:       id,
			Selector: d.Selector,
			Category: d.Category,
			Related:  newResolvedRelated(d.Related),
		}
		entry.resolve(phaseRequest, ec)
		resolved = append(resolved, entry)
	}

	return resolved
}

// ResolveRequest resolves the request-phase ids for all specs (fan-out included)
// against ec. Called by the resource middleware pre-handler.
func ResolveRequest(defs []ResourceSpec, ec ExtractorContext) []*ResolvedResource {
	var resolved []*ResolvedResource
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec)...)
	}

	return resolved
}
