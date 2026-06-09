// Declaration API a route author writes: the resource defs an operation acts on.
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

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
