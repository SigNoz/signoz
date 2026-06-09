// Declaration API a route author writes: the resource defs an operation acts on.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

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

// RelatedResource is a counterpart named purely for audit clarity. It carries no
// verb and no selector and is not authz-checked.
type RelatedResource struct {
	Resource coretypes.Resource
	ID       ResourceIDExtractor
}

func (ResourceDef) sealResourceSpec() {}

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

// ResolveRequest resolves the request-phase ids for all specs (fan-out included)
// against ec. Called by the resource middleware pre-handler.
func ResolveRequest(defs []ResourceSpec, ec ExtractorContext) []*ResolvedResource {
	var resolved []*ResolvedResource
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec)...)
	}

	return resolved
}
