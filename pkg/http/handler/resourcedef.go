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
	ID       coretypes.ResourceIDExtractor
	Selector SelectorFunc
	Category audittypes.ActionCategory
	Related  *RelatedResource
}

func (d ResourceDef) resolveRequest(ec coretypes.ExtractorContext) []*ResolvedResource {
	resolved := &ResolvedResource{
		Resource:    d.Resource,
		Verb:        d.Verb,
		Selector:    d.Selector,
		Category:    d.Category,
		idExtractor: d.ID,
		Related:     newResolvedRelated(d.Related),
	}
	resolved.resolve(coretypes.PhaseRequest, ec)

	return []*ResolvedResource{resolved}
}
